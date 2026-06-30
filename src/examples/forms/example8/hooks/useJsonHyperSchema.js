// ---------------------------------------------------------------------------
// useJsonHyperSchema — orquestador del schema jsonHyperSchema.
//
// Se apoya en la capa de servicios (../services/mockService) para resolver
// cada link. Por defecto intenta el fetch real y cae al mock (valueTest)
// si la red falla. Esto permite que el editor funcione offline.
//
// API pública (compatible con la versión previa):
//   useJsonHyperSchema(initialSchema, formData, onUpdate)
//   useJsonHyperSchema(initialSchema, formData, onUpdate, { service })
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { renderTemplate, renderTemplateRecursive } from '../templates/template';
import { createMockService } from '../services/mockService';

// ---------------------------------------------------------------------------
// Utilidades puras
// ---------------------------------------------------------------------------

const clone = (value) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const resolvePointer = (data, pointer) => {
  if (!pointer || pointer === '/' || pointer === '$root') return data;
  if (typeof pointer !== 'string') return pointer;
  return pointer
    .split('/')
    .filter(Boolean)
    .reduce((acc, key) => acc?.[key], data);
};

const setValue = (obj, pointer, value) => {
  const parts = pointer.split('/').filter(Boolean);
  const next = clone(obj);
  let current = next;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    current = current[part] ??= {};
  });
  return next;
};

const expandUriTemplate = (template, params) => {
  let url = template;
  url = url.replace(/{([^{?]+)}/g, (_, key) => params[key] || '');
  url = url.replace(/{\?([^}]+)}/g, (_, list) => {
    const query = list
      .split(',')
      .map((key) =>
        params[key] !== undefined
          ? `${key}=${encodeURIComponent(params[key])}`
          : null
      )
      .filter(Boolean)
      .join('&');
    return query ? `?${query}` : '';
  });
  return url;
};

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

// ---------------------------------------------------------------------------
// Resolución de valores
// ---------------------------------------------------------------------------

const buildTemplateScope = (responseData, inputValues = {}, item) => ({
  ...(inputValues || {}),
  ...(responseData && typeof responseData === 'object' && !Array.isArray(responseData)
    ? responseData
    : {}),
  ...(item && typeof item === 'object' && !Array.isArray(item) ? item : {}),
  inputValues: inputValues || {},
  response: responseData,
  item,
});

const resolveItemTemplate = async (item, template, responseData, inputValues) => {
  if (template === '$item') return item;
  if (typeof template === 'string' && template.includes('{{')) {
    return renderTemplate(template, buildTemplateScope(responseData, inputValues, item));
  }
  return resolvePointer(item, template);
};

const resolveItemValue = async (item, source, responseData, inputValues) => {
  const { itemValue, stringify } = source;
  if (typeof itemValue === 'string' && itemValue.includes('{{')) {
    return renderTemplate(itemValue, buildTemplateScope(responseData, inputValues, item));
  }
  const resolved = resolvePointer(item, itemValue);
  return stringify && resolved != null ? String(resolved) : resolved;
};

const normalizeValue = async (value, source, responseData, inputValues) => {
  if (Array.isArray(value) && source?.itemValue) {
    const resolved = await Promise.all(
      value.map((item) => resolveItemValue(item, source, responseData, inputValues))
    );
    return resolved.filter((item) => !isEmptyValue(item));
  }
  if (Array.isArray(value) && source?.item) {
    return Promise.all(
      value.map((item) => renderTemplateRecursive(source.item, item))
    );
  }
  return value;
};

const resolveSource = async (data, source, inputValues = {}) => {
  if (typeof source === 'string') {
    if (source.includes('{{')) {
      return renderTemplate(source, buildTemplateScope(data, inputValues));
    }
    return resolvePointer(data, source);
  }
  if (!source || typeof source !== 'object') return source;
  const base = resolvePointer(data, source.path || '/');
  return normalizeValue(base, source, data, inputValues);
};

const getMappedValue = async (data, source, fallback, inputValues = {}) => {
  const primary = await resolveSource(data, source, inputValues);
  if (!isEmptyValue(primary)) return primary;
  return fallback != null ? await resolveSource(data, fallback, inputValues) : primary;
};

const ensureEnumContainsValue = (schema, dataPointer, value) => {
  const propertyName = dataPointer.split('/').filter(Boolean)[0];
  const currentEnum = schema.properties?.[propertyName]?.enum;
  if (!Array.isArray(currentEnum) || value === undefined || value === null) return schema;
  const values = Array.isArray(value) ? value : [value];
  const nextEnum = [...currentEnum];
  values.forEach((item) => {
    if (item !== '' && !nextEnum.includes(item)) nextEnum.push(item);
  });
  return setValue(schema, `/properties/${propertyName}/enum`, nextEnum);
};

// ---------------------------------------------------------------------------
// Aplicación de mappings
// ---------------------------------------------------------------------------

const applyFormatMapping = (data, target, source, responseData) => {
  const formatted = source.format.replace(
    /{([^}]+)}/g,
    (_, pointer) => resolvePointer(responseData, pointer) ?? ''
  );
  return setValue(data, target, formatted.trim());
};

const normalizeMappingTarget = (target) => {
  if (target.startsWith('/')) return target;
  const [field, keyword] = target.split('.');
  return `/${field}/${keyword}`;
};

const applyEnumMapping = (schema, target, value, labels) => {
  const normalizedTarget = normalizeMappingTarget(target);
  const enumSchema = setValue(schema, `/properties${normalizedTarget}`, value || []);
  if (!labels) return enumSchema;

  const labelTarget = normalizedTarget.replace(/\/enum$/, '/enumNames');
  return setValue(enumSchema, `/properties${labelTarget}`, labels || []);
};

const applyValueMapping = (data, schema, cleanTarget, value, isDefault) => {
  const nextData = setValue(data, cleanTarget, value);
  let nextSchema = ensureEnumContainsValue(schema, cleanTarget, value);
  if (!isDefault && !isEmptyValue(value)) {
    const propertyName = cleanTarget.split('/').filter(Boolean)[0];
    if (propertyName && nextSchema.properties?.[propertyName] !== undefined) {
      nextSchema = setValue(nextSchema, `/properties/${propertyName}/default`, value);
    }
  }
  return { nextData, nextSchema };
};

// ---------------------------------------------------------------------------
// Clasificación de links
// ---------------------------------------------------------------------------

/** @returns {'init'|'catalog'|'dependent'|'independent'} */
const getLinkRole = (link) => {
  const role = (link['x-data-role'] || link['x-dataRole'] || '').toLowerCase();
  if (role === 'init') return 'init';
  if (role === 'catalog') return 'catalog';
  if (role === 'dependent' || hasTemplatePointers(link)) return 'dependent';
  if (link.isDataInput === '1' || link.isDataInput === 1 || link.isDataInput === true)
    return 'init';
  return 'independent';
};

const hasTemplatePointers = (link) =>
  Object.keys(link.templatePointers || {}).length > 0;

// ---------------------------------------------------------------------------
// Helpers de links
// ---------------------------------------------------------------------------

const getLinkMethod = (link) => (link.method || 'GET').toUpperCase();

const getResponseMapping = (link) =>
  link['x-responseMapping'] || link['x-response-mapping'] || {};

const getRequestMapping = (link) =>
  link['x-requestMapping'] || link['x-request-mapping'] || {};

const getLinkKey = (link, index) => `${index}:${link.rel || ''}:${link.href}`;

const getSchemaByPointer = (schema, pointer) => {
  const parts = pointer.split('/').filter(Boolean);
  let current = schema;
  for (const part of parts) {
    current = current?.properties?.[part] || current?.[part];
  }
  return current;
};

const buildTemplateParams = (link, data, schema) => {
  const params = {};
  Object.entries(link.templatePointers || {}).forEach(([key, pointer]) => {
    let val = resolvePointer(data, pointer);
    if (isEmptyValue(val)) {
      const schemaNode = getSchemaByPointer(schema, pointer);
      if (schemaNode?.default !== undefined) val = schemaNode.default;
    }
    params[key] = val;
  });
  return params;
};

const hasInvalidTemplateParams = (link, params, schema) =>
  Object.entries(params).some(([key, value]) => {
    if (isEmptyValue(value)) return true;
    const pointer = link.templatePointers?.[key];
    const schemaNode = pointer ? getSchemaByPointer(schema, pointer) : null;
    return (
      typeof value === 'string' &&
      schemaNode?.minLength !== undefined &&
      value.length < schemaNode.minLength
    );
  });

// ---------------------------------------------------------------------------
// Fetcher HTTP directo (usado como realFetcher por defecto del service)
// ---------------------------------------------------------------------------

const fetchLink = async (link, url, currentData) => {
  const method = getLinkMethod(link);
  const fetchOptions = { method };
  if (method !== 'GET' && method !== 'HEAD') {
    const requestMapping = getRequestMapping(link);
    if (Object.keys(requestMapping).length) {
      const body = {};
      Object.entries(requestMapping).forEach(([target, source]) => {
        body[target.replace(/^\//, '')] = resolvePointer(currentData, source);
      });
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(body);
    }
  }
  const response = await fetch(url, fetchOptions);
  if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`);
  return response.json();
};

// ---------------------------------------------------------------------------
// Service por defecto: intenta red, si falla usa mock (valueTest).
// ---------------------------------------------------------------------------

const buildDefaultService = () => {
  const realFetcher = (link) => {
    const url = expandUriTemplate(link.href, {});
    return fetchLink(link, url, {});
  };
  return createMockService({
    realFetcher,
    mode: 'try-real-then-mock',
  });
};

// ---------------------------------------------------------------------------
// Fases secuenciales de carga
// ---------------------------------------------------------------------------

const runLinkPhase = async (links, data, schema, mapResponse, service) => {
  const responses = await Promise.all(
    links.map(async (link) => {
      const url = expandUriTemplate(link.href, {});
      const resolved = await service.resolve({ ...link, href: url });
      return { link, responseData: resolved.data };
    })
  );

  let nextData = data;
  let nextSchema = schema;
  for (const { link, responseData } of responses) {
    const mapped = await mapResponse(link, responseData, nextData, nextSchema);
    nextData = mapped.updatedData;
    nextSchema = mapped.updatedSchema;
  }

  return { nextData, nextSchema };
};

// ---------------------------------------------------------------------------
// Cache de template links (dependent)
// ---------------------------------------------------------------------------

const warmTemplateCache = (links, formData, schema, cacheRef) => {
  links.forEach((link, index) => {
    if (!hasTemplatePointers(link)) return;
    const params = buildTemplateParams(link, formData, schema);
    const linkKey = getLinkKey(link, index);
    if (hasInvalidTemplateParams(link, params, schema)) {
      delete cacheRef.current[linkKey];
      return;
    }
    cacheRef.current[linkKey] = expandUriTemplate(link.href, params);
  });
};

const runTemplateLinks = async (links, formData, schema, cacheRef, executeLink) => {
  for (const [index, link] of links.entries()) {
    if (!hasTemplatePointers(link)) continue;
    const params = buildTemplateParams(link, formData, schema);
    const linkKey = getLinkKey(link, index);
    if (hasInvalidTemplateParams(link, params, schema)) {
      delete cacheRef.current[linkKey];
      continue;
    }
    const url = expandUriTemplate(link.href, params);
    if (url === cacheRef.current[linkKey]) continue;
    cacheRef.current[linkKey] = url;
    await executeLink(link, url, formData);
  }
};

// ---------------------------------------------------------------------------
// Efectos
// ---------------------------------------------------------------------------

const useInitialLinks = ({
  initialSchema,
  formData,
  currentSchema,
  mapResponse,
  onUpdate,
  startLoading,
  stopLoading,
  setDataInput,
  skipNextDependentSearch,
  service,
}) => {
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;

    const links = initialSchema.links || [];
    const initLinks        = links.filter((l) => getLinkRole(l) === 'init');
    const catalogLinks     = links.filter((l) => getLinkRole(l) === 'catalog');
    const independentLinks = links.filter((l) => getLinkRole(l) === 'independent');

    if (!initLinks.length && !catalogLinks.length && !independentLinks.length) return;

    hasLoaded.current = true;

    const load = async () => {
      startLoading();
      try {
        let nextData   = { ...formData };
        let nextSchema = clone(currentSchema.current);

        if (initLinks.length) {
          const phase = await runLinkPhase(initLinks, nextData, nextSchema, mapResponse, service);
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
          setDataInput(nextData);
        }

        if (catalogLinks.length) {
          const phase = await runLinkPhase(catalogLinks, nextData, nextSchema, mapResponse, service);
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
        }

        if (independentLinks.length) {
          const phase = await runLinkPhase(independentLinks, nextData, nextSchema, mapResponse, service);
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
        }

        currentSchema.current = nextSchema;
        skipNextDependentSearch.current = true;
        onUpdate(nextData, nextSchema);
      } catch (error) {
        console.error('[useJsonHyperSchema] Error en carga inicial:', error);
      } finally {
        stopLoading();
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const useTemplateLinks = ({
  initialSchema,
  formData,
  currentSchema,
  executeLink,
  lastTemplateRequestKeys,
  skipNextDependentSearch,
  service,
}) => {
  useEffect(() => {
    const links = (initialSchema.links || []).filter(
      (l) => getLinkRole(l) === 'dependent'
    );
    if (!links.length) return;

    if (skipNextDependentSearch.current) {
      warmTemplateCache(links, formData, currentSchema.current, lastTemplateRequestKeys);
      skipNextDependentSearch.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      runTemplateLinks(
        links,
        formData,
        currentSchema.current,
        lastTemplateRequestKeys,
        async (link, url, currentData) => {
          const resolved = await service.resolve({ ...link, href: url });
          return resolved.data;
        }
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [
    executeLink,
    formData,
    initialSchema,
    currentSchema,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
    service,
  ]);
};

// ---------------------------------------------------------------------------
// Lógica condicional allOf / if-then-else
// ---------------------------------------------------------------------------

const useResolveLogic = () =>
  useCallback((currentData, schema) => {
    const updatedSchema = clone(schema);
    const updatedData   = { ...currentData };

    (updatedSchema.allOf || []).forEach((block) => {
      if (!block.if) return;
      const conditionEntry = Object.entries(block.if.properties || {})[0];
      if (!conditionEntry) return;

      const [key, constraints] = conditionEntry;
      const val     = currentData[key];
      const isMatch =
        (constraints.minimum === undefined || val >= constraints.minimum) &&
        (constraints.maximum === undefined || val <= constraints.maximum);
      const branch  = isMatch ? block.then : block.else;

      if (branch?.properties) {
        Object.entries(branch.properties).forEach(([propKey, propValue]) => {
          if (propValue.const?.$data) {
            const sourcePath = propValue.const.$data.split('/').pop();
            if (updatedData[propKey] !== updatedData[sourcePath]) {
              updatedData[propKey] = updatedData[sourcePath];
            }
          }
          if (!updatedSchema.properties[propKey]) {
            updatedSchema.properties[propKey] = propValue;
          }
        });
      }
    });

    return { updatedData, updatedSchema };
  }, []);

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useJsonHyperSchema(initialSchema, formData, onUpdate, options = {}) {
  const [loading, setLoading]   = useState(false);
  const [dataInput, setDataInput] = useState(null);

  const currentSchema            = useRef(initialSchema);
  const lastTemplateRequestKeys  = useRef({});
  const skipNextDependentSearch  = useRef(false);
  const pendingRequests          = useRef(0);

  // Service: si el caller inyecta uno, lo usa; si no, usa el default
  // (intenta red, fallback a valueTest).
  const serviceRef = useRef(options.service || buildDefaultService());

  const startLoading = useCallback(() => {
    if (++pendingRequests.current === 1) setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (--pendingRequests.current <= 0) {
      pendingRequests.current = 0;
      setLoading(false);
    }
  }, []);

  const resolveLogic = useResolveLogic();

  const mapResponse = useCallback(
    async (link, responseData, currentData, schema) => {
      let nextData   = { ...currentData };
      let nextSchema = clone(schema);

      for (const [target, source] of Object.entries(getResponseMapping(link))) {
        if (typeof source === 'object' && source?.format) {
          nextData = applyFormatMapping(nextData, target, source, responseData);
          continue;
        }

        const isDefault = target.endsWith('/default') || target.endsWith('.default');
        const normalizedTarget = normalizeMappingTarget(target);
        const isEnum = normalizedTarget.endsWith('/enum');
        const isEnumNames = normalizedTarget.endsWith('/enumNames');
        const cleanTarget = isDefault
          ? normalizedTarget.slice(0, -'/default'.length)
          : normalizedTarget;

        if (isEnum && source && typeof source === 'object' && source.itemLabel) {
          const sourceArray = await resolveSource(
            responseData,
            { path: source.path || '$root' },
            currentData
          );
          const items = Array.isArray(sourceArray) ? sourceArray : [];
          const [values, labels] = await Promise.all([
            Promise.all(
              items.map((item) =>
                resolveItemTemplate(item, source.itemValue, responseData, currentData)
              )
            ),
            Promise.all(
              items.map((item) =>
                resolveItemTemplate(item, source.itemLabel, responseData, currentData)
              )
            ),
          ]);
          nextSchema = applyEnumMapping(
            nextSchema,
            target,
            values.filter((item) => !isEmptyValue(item)),
            labels.filter((item) => !isEmptyValue(item))
          );
          continue;
        }

        const value = await getMappedValue(
          responseData,
          source,
          isDefault ? source : undefined,
          currentData
        );

        if (isEnumNames) {
          nextSchema = setValue(nextSchema, `/properties${normalizedTarget}`, value || []);
          continue;
        }

        if (isEnum) {
          nextSchema = applyEnumMapping(nextSchema, target, value);
          continue;
        }

        const mapped = applyValueMapping(nextData, nextSchema, cleanTarget, value, isDefault);
        nextData   = mapped.nextData;
        nextSchema = mapped.nextSchema;
      }

      const { updatedData, updatedSchema } = resolveLogic(nextData, nextSchema);
      return { updatedData, updatedSchema };
    },
    [resolveLogic]
  );

  const executeLink = useCallback(
    async (link, url, currentData) => {
      startLoading();
      try {
        const resolved = await serviceRef.current.resolve({ ...link, href: url });
        const mapped = await mapResponse(link, resolved.data, currentData, currentSchema.current);
        currentSchema.current = mapped.updatedSchema;
        onUpdate(mapped.updatedData, mapped.updatedSchema);
        return mapped;
      } catch (error) {
        console.error('[useJsonHyperSchema] Error ejecutando link:', link.rel, error);
        return null;
      } finally {
        stopLoading();
      }
    },
    [mapResponse, onUpdate, startLoading, stopLoading]
  );

  useInitialLinks({
    initialSchema,
    formData,
    currentSchema,
    mapResponse,
    onUpdate,
    startLoading,
    stopLoading,
    setDataInput,
    skipNextDependentSearch,
    service: serviceRef.current,
  });

  useTemplateLinks({
    initialSchema,
    formData,
    currentSchema,
    executeLink,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
    service: serviceRef.current,
  });

  return { loading, dataInput };
}