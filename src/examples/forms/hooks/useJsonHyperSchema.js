import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Utilidades puras
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
// Resolución de valores
// ---------------------------------------------------------------------------

const normalizeValue = (value, source) => {
  if (Array.isArray(value) && source?.itemValue) {
    return value
      .map((item) => {
        const resolved = resolvePointer(item, source.itemValue);
        return source.stringify && resolved != null ? String(resolved) : resolved;
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

const applyEnumMapping = (schema, target, value) =>
  setValue(schema, `/properties${target}`, value || []);

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
// FIX: ahora hay tres roles claros: init | catalog | dependent (templatePointers)
// ---------------------------------------------------------------------------

/** @returns {'init'|'catalog'|'dependent'|'independent'} */
const getLinkRole = (link) => {
  const role = (link['x-data-role'] || link['x-dataRole'] || '').toLowerCase();
  if (role === 'init') return 'init';
  if (role === 'catalog') return 'catalog';
  if (role === 'dependent' || hasTemplatePointers(link)) return 'dependent';
  // legacy: isDataInput sin templatePointers → init
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
// Fases secuenciales de carga
// FIX: runLinkPhase ahora usa fetchLink (con headers/body) en lugar de fetch directo
// ---------------------------------------------------------------------------

/**
 * Ejecuta un grupo de links en paralelo y acumula data/schema.
 * Los links de esta fase NO tienen templatePointers.
 */
const runLinkPhase = async (links, data, schema, mapResponse) => {
  const responses = await Promise.all(
    links.map(async (link) => {
      const url = expandUriTemplate(link.href, {});
      // FIX: usar fetchLink para consistencia (headers, body, error check)
      const responseData = await fetchLink(link, url, data);
      return { link, responseData };
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
// Efecto: init → catalog → independent  (orden garantizado)
// FIX: schema correcto pasado en cada fase; catalog recibe data del init
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

    // FIX: clasificar correctamente; "dependent" NO entra en esta fase
    const initLinks        = links.filter((l) => getLinkRole(l) === 'init');
    const catalogLinks     = links.filter((l) => getLinkRole(l) === 'catalog');
    const independentLinks = links.filter((l) => getLinkRole(l) === 'independent');

    if (!initLinks.length && !catalogLinks.length && !independentLinks.length) return;

    hasLoaded.current = true;

    const load = async () => {
      startLoading();
      try {
        let nextData   = { ...formData };
        // FIX: usar currentSchema.current como punto de partida (no initialSchema)
        let nextSchema = clone(currentSchema.current);

        // 1️⃣  init — datos de usuario / sesión
        if (initLinks.length) {
          const phase = await runLinkPhase(initLinks, nextData, nextSchema, mapResponse);
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
          setDataInput(nextData);                // expone datos de init al exterior
        }

        // 2️⃣  catalog — catálogos que pueden depender del resultado del init
        if (catalogLinks.length) {
          const phase = await runLinkPhase(catalogLinks, nextData, nextSchema, mapResponse);
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
        }

        // 3️⃣  independent — links sin rol y sin templatePointers
        if (independentLinks.length) {
          const phase = await runLinkPhase(independentLinks, nextData, nextSchema, mapResponse);
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
  }, []); // Solo al montar — las dependencias son estables (refs + callbacks memorizados)
};

// ---------------------------------------------------------------------------
// Efecto: dependent links (templatePointers)
// FIX: pasar currentSchema.current al calentador de cache
// ---------------------------------------------------------------------------

const useTemplateLinks = ({
  initialSchema,
  formData,
  currentSchema,
  executeLink,
  lastTemplateRequestKeys,
  skipNextDependentSearch,
}) => {
  useEffect(() => {
    const links = (initialSchema.links || []).filter(
      (l) => getLinkRole(l) === 'dependent'
    );
    if (!links.length) return;

    if (skipNextDependentSearch.current) {
      // FIX: calentar con el schema actualizado, no con initialSchema
      warmTemplateCache(links, formData, currentSchema.current, lastTemplateRequestKeys);
      skipNextDependentSearch.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      runTemplateLinks(
        links,
        formData,
        // FIX: pasar schema actual para que buildTemplateParams lea defaults correctos
        currentSchema.current,
        lastTemplateRequestKeys,
        executeLink
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

export function useJsonHyperSchema(initialSchema, formData, onUpdate) {
  const [loading, setLoading]   = useState(false);
  const [dataInput, setDataInput] = useState(null);

  const currentSchema            = useRef(initialSchema);
  const lastTemplateRequestKeys  = useRef({});
  const skipNextDependentSearch  = useRef(false);
  const pendingRequests          = useRef(0);

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

  // FIX: mapResponse siempre recibe el schema actual desde el caller,
  //      ya no depende de initialSchema como fallback interno
  const mapResponse = useCallback(
    (link, responseData, currentData, schema) => {
      let nextData   = { ...currentData };
      let nextSchema = clone(schema);

      for (const [target, source] of Object.entries(getResponseMapping(link))) {
        if (typeof source === 'object' && source?.format) {
          nextData = applyFormatMapping(nextData, target, source, responseData);
          continue;
        }

        const isEnum    = target.includes('/enum');
        const isDefault = target.endsWith('/default');
        const cleanTarget = isDefault ? target.slice(0, -'/default'.length) : target;

        const value = getMappedValue(
          responseData,
          source,
          isDefault ? source : undefined
        );

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
    [resolveLogic]  // FIX: ya no depende de initialSchema
  );

  const executeLink = useCallback(
    async (link, url, currentData) => {
      startLoading();
      try {
        const responseData = await fetchLink(link, url, currentData);
        const mapped = mapResponse(link, responseData, currentData, currentSchema.current);
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
  });

  useTemplateLinks({
    initialSchema,
    formData,
    currentSchema,       // FIX: pasado correctamente
    executeLink,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
  });

  return { loading, dataInput };
}