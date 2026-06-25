import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Utilidades puras (JSON pointer)
// ---------------------------------------------------------------------------

const clone = (value) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const resolvePointer = (data, pointer) => {
  if (!pointer || pointer === '/') return data;
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
// Resolución de valores de mapeo
// ---------------------------------------------------------------------------

const normalizeValue = (value, source) => {
  if (Array.isArray(value) && source?.itemValue) {
    return value
      .map((item) => {
        const resolved = resolvePointer(item, source.itemValue);
        return source.stringify && resolved != null
          ? String(resolved)
          : resolved;
      })
      .filter((resolved) => resolved != null);
  }

  return value;
};

const resolveSource = (data, source) => {
  if (typeof source === 'string') return resolvePointer(data, source);
  if (!source || typeof source !== 'object') return source;

  const base = resolvePointer(data, source.path || '/');
  return normalizeValue(base, source);
};

const getMappedValue = (data, source, fallback) => {
  const primary = resolveSource(data, source);
  if (!isEmptyValue(primary)) return primary;

  return fallback != null ? resolveSource(data, fallback) : primary;
};

const ensureEnumContainsValue = (schema, dataPointer, value) => {
  const propertyName = dataPointer.split('/').filter(Boolean)[0];
  const currentEnum = schema.properties?.[propertyName]?.enum;

  if (!Array.isArray(currentEnum) || value === undefined || value === null) {
    return schema;
  }

  const values = Array.isArray(value) ? value : [value];
  const nextEnum = [...currentEnum];

  values.forEach((item) => {
    if (item !== '' && !nextEnum.includes(item)) {
      nextEnum.push(item);
    }
  });

  return setValue(schema, `/properties/${propertyName}/enum`, nextEnum);
};

// ---------------------------------------------------------------------------
// Aplicación de mappings (una responsabilidad por función)
// ---------------------------------------------------------------------------

const applyFormatMapping = (data, target, source, responseData) => {
  const formatted = source.format.replace(
    /{([^}]+)}/g,
    (_, pointer) => resolvePointer(responseData, pointer) ?? ''
  );

  return setValue(data, target, formatted.trim());
};

const applyEnumMapping = (schema, target, value) =>
  setValue(schema, `/properties${target}`, value || []);

const applyValueMapping = (data, schema, cleanTarget, value, isDefault) => {
  const nextData = setValue(data, cleanTarget, value);
  let nextSchema = ensureEnumContainsValue(schema, cleanTarget, value);

  // Guardar el valor también como `default` en el schema para que los template
  // pointers puedan usarlo cuando el campo no haya sido editado por el usuario.
  // Solo si hay un valor real: escribir `default: undefined` no aporta nada.
  if (!isDefault && !isEmptyValue(value)) {
    const propertyName = cleanTarget.split('/').filter(Boolean)[0];
    if (propertyName && nextSchema.properties?.[propertyName] !== undefined) {
      nextSchema = setValue(
        nextSchema,
        `/properties/${propertyName}/default`,
        value
      );
    }
  }

  return { nextData, nextSchema };
};

// ---------------------------------------------------------------------------
// Helpers de links (hyper-schema)
// ---------------------------------------------------------------------------

const isDataInputLink = (link) => {
  const role = link['x-data-role'] || link['x-dataRole'];
  if (role === 'init' || role === 'catalog') return true;
  return (
    link.isDataInput === '1' ||
    link.isDataInput === 1 ||
    link.isDataInput === true
  );
};

const hasTemplatePointers = (link) =>
  Object.keys(link.templatePointers || {}).length > 0;

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

      if (schemaNode?.default !== undefined) {
        val = schemaNode.default;
      }
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
  return response.json();
};

// Ejecuta un grupo de links sin template pointers y acumula data/schema.
const runLinkPhase = async (links, data, schema, mapResponse) => {
  const responses = await Promise.all(
    links.map(async (link) => {
      const url = expandUriTemplate(link.href, {});
      const response = await fetch(url);
      return { link, responseData: await response.json() };
    })
  );

  let nextData = data;
  let nextSchema = schema;

  responses.forEach(({ link, responseData }) => {
    const mapped = mapResponse(link, responseData, nextData, nextSchema);
    nextData = mapped.updatedData;
    nextSchema = mapped.updatedSchema;
  });

  return { nextData, nextSchema };
};

// Precalienta la cache de URLs (no dispara requests). Se usa tras la carga
// inicial para evitar que el efecto dependiente vuelva a pedir lo mismo.
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

// Ejecuta los template links cuya URL haya cambiado respecto a la cache.
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
// Efectos internos del hook
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
}) => {
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;

    const links = initialSchema.links || [];
    const inputLinks = links.filter(
      (link) => isDataInputLink(link) && !hasTemplatePointers(link)
    );
    const independentLinks = links.filter(
      (link) => !isDataInputLink(link) && !hasTemplatePointers(link)
    );

    if (!inputLinks.length && !independentLinks.length) return;

    hasLoaded.current = true;

    const loadInputLinks = async () => {
      startLoading();

      try {
        let nextData = { ...formData };
        let nextSchema = clone(currentSchema.current);

        const inputPhase = await runLinkPhase(
          inputLinks,
          nextData,
          nextSchema,
          mapResponse
        );
        nextData = inputPhase.nextData;
        nextSchema = inputPhase.nextSchema;
        setDataInput(nextData);

        const independentPhase = await runLinkPhase(
          independentLinks,
          nextData,
          nextSchema,
          mapResponse
        );
        nextData = independentPhase.nextData;
        nextSchema = independentPhase.nextSchema;

        currentSchema.current = nextSchema;
        skipNextDependentSearch.current = true;
        onUpdate(nextData, nextSchema);
      } catch (error) {
        console.error('Error fetching input schema data', error);
      } finally {
        stopLoading();
      }
    };

    loadInputLinks();
  }, [
    formData,
    initialSchema,
    currentSchema,
    mapResponse,
    onUpdate,
    startLoading,
    stopLoading,
    setDataInput,
    skipNextDependentSearch,
  ]);
};

const useTemplateLinks = ({
  initialSchema,
  formData,
  executeLink,
  lastTemplateRequestKeys,
  skipNextDependentSearch,
}) => {
  useEffect(() => {
    const links = initialSchema.links || [];

    if (skipNextDependentSearch.current) {
      warmTemplateCache(
        links,
        formData,
        initialSchema,
        lastTemplateRequestKeys
      );
      skipNextDependentSearch.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      runTemplateLinks(
        links,
        formData,
        initialSchema,
        lastTemplateRequestKeys,
        executeLink
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [
    executeLink,
    formData,
    initialSchema,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
  ]);
};

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useJsonHyperSchema(initialSchema, formData, onUpdate) {
  const [loading, setLoading] = useState(false);
  const [dataInput, setDataInput] = useState(null);
  const currentSchema = useRef(initialSchema);
  const lastTemplateRequestKeys = useRef({});
  const skipNextDependentSearch = useRef(false);
  const pendingRequests = useRef(0);

  // Loading basado en un contador: solo cambia en el primer request que entra
  // y en el último que sale, evitando flickering con peticiones concurrentes.
  const startLoading = useCallback(() => {
    if (++pendingRequests.current === 1) setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (--pendingRequests.current <= 0) {
      pendingRequests.current = 0;
      setLoading(false);
    }
  }, []);

  const resolveLogic = useCallback((currentData, schema) => {
    const updatedSchema = clone(schema);
    const updatedData = { ...currentData };
    let changed = false;

    if (updatedSchema.allOf) {
      updatedSchema.allOf.forEach((block) => {
        if (!block.if) return;

        const conditionEntry = Object.entries(block.if.properties || {})[0];
        if (!conditionEntry) return;

        const [key, constraints] = conditionEntry;
        const val = currentData[key];
        const isMatch =
          (constraints.minimum === undefined || val >= constraints.minimum) &&
          (constraints.maximum === undefined || val <= constraints.maximum);
        const branch = isMatch ? block.then : block.else;

        if (branch?.properties) {
          Object.entries(branch.properties).forEach(
            ([propertyKey, propertyValue]) => {
              if (propertyValue.const?.$data) {
                const sourcePath = propertyValue.const.$data.split('/').pop();

                if (updatedData[propertyKey] !== updatedData[sourcePath]) {
                  updatedData[propertyKey] = updatedData[sourcePath];
                  changed = true;
                }
              }

              if (!updatedSchema.properties[propertyKey]) {
                updatedSchema.properties[propertyKey] = propertyValue;
                changed = true;
              }
            }
          );
        }
      });
    }

    return { updatedData, updatedSchema, changed };
  }, []);

  const mapResponse = useCallback(
    (link, responseData, currentData, schema = initialSchema) => {
      let nextData = { ...currentData };
      let nextSchema = clone(schema);

      const mappings = getResponseMapping(link);

      for (const [target, source] of Object.entries(mappings)) {
        if (typeof source === 'object' && source?.format) {
          nextData = applyFormatMapping(nextData, target, source, responseData);
          continue;
        }

        const isEnum = target.includes('/enum');
        const isDefault = target.endsWith('/default');
        const cleanTarget = isDefault
          ? target.slice(0, -'/default'.length)
          : target;

        const value = getMappedValue(
          responseData,
          source,
          isDefault ? source : undefined
        );

        if (isEnum) {
          nextSchema = applyEnumMapping(nextSchema, target, value);
          continue;
        }

        const mapped = applyValueMapping(
          nextData,
          nextSchema,
          cleanTarget,
          value,
          isDefault
        );
        nextData = mapped.nextData;
        nextSchema = mapped.nextSchema;
      }

      const { updatedData, updatedSchema } = resolveLogic(nextData, nextSchema);
      return { updatedData, updatedSchema };
    },
    [initialSchema, resolveLogic]
  );

  const executeLink = useCallback(
    async (link, url, currentData) => {
      startLoading();

      try {
        const responseData = await fetchLink(link, url, currentData);
        const mapped = mapResponse(
          link,
          responseData,
          currentData,
          currentSchema.current
        );

        currentSchema.current = mapped.updatedSchema;
        onUpdate(mapped.updatedData, mapped.updatedSchema);

        return mapped;
      } catch (error) {
        console.error('Error fetching schema data', error);
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
  });

  useTemplateLinks({
    initialSchema,
    formData,
    executeLink,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
  });

  return { loading, dataInput };
}
