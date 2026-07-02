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

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { renderTemplate, renderTemplateRecursive } from '@/examples/inputVars/utils/TemplateExpressionEngineCEL';
import { createMockService } from '../services/mockService';

type AnyRecord = Record<string, any>;
type LinkRole = 'init' | 'catalog' | 'dependent' | 'independent';
type HyperSchemaLink = AnyRecord;
type JsonHyperSchema = AnyRecord;

// ---------------------------------------------------------------------------
// Utilidades puras
// ---------------------------------------------------------------------------

const clone = (value: any) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const resolvePointer = (data: any, pointer: any) => {
  if (!pointer || pointer === '/' || pointer === '$root') return data;
  if (typeof pointer !== 'string') return pointer;
  return pointer
    .split('/')
    .filter(Boolean)
    .reduce((acc, key) => acc?.[key], data);
};

const setValue = (obj: any, pointer: string, value: any) => {
  const parts = pointer.split('/').filter(Boolean);
  const next = clone(obj);
  let current: AnyRecord = next;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    current = current[part] ??= {};
  });
  return next;
};

const isEmptyValue = (value: any) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

const getSchemaLinks = (schema: JsonHyperSchema): HyperSchemaLink[] => schema?.initialLink || schema?.links || [];

// ---------------------------------------------------------------------------
// Resolución de valores
// ---------------------------------------------------------------------------

const buildTemplateScope = (responseData: any, inputValues: AnyRecord = {}, item?: any): AnyRecord => ({
  ...(inputValues || {}),
  ...(responseData && typeof responseData === 'object' && !Array.isArray(responseData)
    ? responseData
    : {}),
  ...(item && typeof item === 'object' && !Array.isArray(item) ? item : {}),
  inputValues: inputValues || {},
  response: responseData,
  item,
});

const resolveItemTemplate = async (item: any, template: any, responseData: any, inputValues: AnyRecord) => {
  if (template === '$item') return item;
  if (typeof template === 'string' && template.includes('{{')) {
    return renderTemplate(template, buildTemplateScope(responseData, inputValues, item));
  }
  return resolvePointer(item, template);
};

const resolveItemValue = async (item: any, source: AnyRecord, responseData: any, inputValues: AnyRecord) => {
  const { itemValue, stringify } = source;
  if (typeof itemValue === 'string' && itemValue.includes('{{')) {
    return renderTemplate(itemValue, buildTemplateScope(responseData, inputValues, item));
  }
  const resolved = resolvePointer(item, itemValue);
  return stringify && resolved != null ? String(resolved) : resolved;
};

const normalizeValue = async (value: any, source: AnyRecord, responseData: any, inputValues: AnyRecord) => {
  if (Array.isArray(value) && source?.itemValue) {
    const resolved = await Promise.all(
      value.map((item) => resolveItemValue(item, source, responseData, inputValues))
    );
    return resolved.filter((item) => !isEmptyValue(item));
  }
  if (Array.isArray(value) && source?.item) {
    return Promise.all(
      value.map((item) => renderTemplateRecursive(source.item, item as AnyRecord))
    );
  }
  return value;
};

const resolveSource = async (data: any, source: any, inputValues: AnyRecord = {}) => {
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

const getMappedValue = async (data: any, source: any, fallback: any, inputValues: AnyRecord = {}) => {
  const primary = await resolveSource(data, source, inputValues);
  if (!isEmptyValue(primary)) return primary;
  return fallback != null ? await resolveSource(data, fallback, inputValues) : primary;
};

const ensureEnumContainsValue = (schema: JsonHyperSchema, dataPointer: string, value: any) => {
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

const applyFormatMapping = (data: AnyRecord, target: string, source: AnyRecord, responseData: any) => {
  const formatted = source.format.replace(
    /{([^}]+)}/g,
    (_, pointer) => resolvePointer(responseData, pointer) ?? ''
  );
  return setValue(data, target, formatted.trim());
};

const normalizeMappingTarget = (target: string) => {
  if (target.startsWith('/')) return target;
  const [field, keyword] = target.split('.');
  return `/${field}/${keyword}`;
};

const applyEnumMapping = (schema: JsonHyperSchema, target: string, value: any, labels?: any[]) => {
  const normalizedTarget = normalizeMappingTarget(target);
  const enumSchema = setValue(schema, `/properties${normalizedTarget}`, value || []);
  if (!labels) return enumSchema;

  const labelTarget = normalizedTarget.replace(/\/enum$/, '/enumNames');
  return setValue(enumSchema, `/properties${labelTarget}`, labels || []);
};

const applyValueMapping = (
  data: AnyRecord,
  schema: JsonHyperSchema,
  cleanTarget: string,
  value: any,
  isDefault: boolean
) => {
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
const getLinkRole = (link: HyperSchemaLink): LinkRole => {
  const role = (link.dataRole || link['x-data-role'] || link['x-dataRole'] || '').toLowerCase();
  if (role === 'init') return 'init';
  if (role === 'catalog') return 'catalog';
  if (role === 'dependent' || hasTemplatePointers(link)) return 'dependent';
  if (link.isDataInput === '1' || link.isDataInput === 1 || link.isDataInput === true)
    return 'init';
  return 'independent';
};

const hasTemplatePointers = (link: HyperSchemaLink) =>
  Object.keys(link.templatePointers || link.request?.templatePointers || {}).length > 0;

// ---------------------------------------------------------------------------
// Helpers de links
// ---------------------------------------------------------------------------

const getLinkMethod = (link: HyperSchemaLink) => (link.request?.method || link.method || 'GET').toUpperCase();

const getResponseMapping = (link: HyperSchemaLink): AnyRecord =>
  link.response?.responseMapping ||
  link['x-responseMapping'] ||
  link['x-response-mapping'] ||
  {};

const getRequestMapping = (link: HyperSchemaLink): AnyRecord =>
  link['x-requestMapping'] || link['x-request-mapping'] || {};

const getLinkUrl = (link: HyperSchemaLink) => link.request?.url || link.href || '';

const getLinkKey = (link: HyperSchemaLink, index: number) => `${index}:${link.id || link.rel || link.name || ''}:${getLinkUrl(link)}`;

const toExecutableLink = (link: HyperSchemaLink, href: string) => ({
  ...link,
  href,
  method: getLinkMethod(link),
  targetSchema: link.response?.jsonSchema || link.targetSchema,
  valueTest: link.response?.testValues ?? link.valueTest,
});

const mergeRuntimeValues = (runtimeValues: AnyRecord = {}, formData: AnyRecord = {}) => ({
  ...(runtimeValues || {}),
  ...(formData || {}),
});

const renderLinkUrl = (link: HyperSchemaLink, values: AnyRecord = {}, useTestValues = true) =>
  renderTemplate(getLinkUrl(link), {
    ...(useTestValues ? link.request?.testValues || {} : {}),
    ...(values || {}),
    formData: values || {},
  });

const buildRequestScope = (link: HyperSchemaLink, values: AnyRecord = {}, useTestValues = true) => ({
  ...(useTestValues ? link.request?.testValues || {} : {}),
  ...(values || {}),
});

const getExternalVariableNames = (link: HyperSchemaLink): string[] => {
  const externalVariables = link.request?.externalVariables;
  const properties = externalVariables?.properties || {};
  if (Array.isArray(externalVariables?.required) && externalVariables.required.length) {
    return externalVariables.required;
  }
  return Object.keys(properties);
};

const getMissingExternalVariables = (link: HyperSchemaLink, values: AnyRecord = {}, useTestValues = true) => {
  const scope = buildRequestScope(link, values, useTestValues);
  return getExternalVariableNames(link).filter((name) => isEmptyValue(scope[name]));
};

const getSchemaByPointer = (schema: JsonHyperSchema, pointer: any) => {
  const parts = pointer.split('/').filter(Boolean);
  let current = schema;
  for (const part of parts) {
    current = current?.properties?.[part] || current?.[part];
  }
  return current;
};

const buildTemplateParams = (link: HyperSchemaLink, data: AnyRecord, schema: JsonHyperSchema) => {
  const params: AnyRecord = {};
  Object.entries(link.templatePointers || link.request?.templatePointers || {}).forEach(([key, pointer]) => {
    let val = resolvePointer(data, pointer);
    if (isEmptyValue(val)) {
      const schemaNode = getSchemaByPointer(schema, pointer);
      if (schemaNode?.default !== undefined) val = schemaNode.default;
      else if (!schemaNode && typeof pointer === 'string' && !pointer.includes('/')) val = pointer;
    }
    params[key] = val;
  });
  return params;
};

const hasInvalidTemplateParams = (link: HyperSchemaLink, params: AnyRecord, schema: JsonHyperSchema) =>
  Object.entries(params).some(([key, value]) => {
    if (isEmptyValue(value)) return true;
    const pointer = (link.templatePointers || link.request?.templatePointers)?.[key];
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

const fetchLink = async (link: HyperSchemaLink, url: string, currentData: AnyRecord) => {
  const method = getLinkMethod(link);
  const fetchOptions: RequestInit = { method };
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

const buildDefaultService = ({ useTestValues = true }: { useTestValues?: boolean } = {}) => {
  const realFetcher = (link: HyperSchemaLink) => {
    return fetchLink(link, link.href, link.currentData || {});
  };
  return createMockService({
    realFetcher,
    mode: 'try-real-then-mock',
    useTestValues,
  });
};

// ---------------------------------------------------------------------------
// Fases secuenciales de carga
// ---------------------------------------------------------------------------

const runLinkPhase = async (
  links: HyperSchemaLink[],
  data: AnyRecord,
  schema: JsonHyperSchema,
  mapResponse: (link: HyperSchemaLink, responseData: any, currentData: AnyRecord, schema: JsonHyperSchema) => Promise<any>,
  service: any,
  useTestValues: boolean,
  runtimeValues: AnyRecord,
  notifyMissingExternalVariables: (link: HyperSchemaLink, missing: string[]) => void
) => {
  const responses = await Promise.all(
    links.map(async (link) => {
      const requestValues = mergeRuntimeValues(runtimeValues, data);
      const missing = getMissingExternalVariables(link, requestValues, useTestValues);
      if (missing.length) {
        notifyMissingExternalVariables(link, missing);
        return null;
      }
      const url = await renderLinkUrl(link, requestValues, useTestValues);
      const resolved = await service.resolve({
        ...toExecutableLink(link, url),
        currentData: requestValues,
      });
      return { link, responseData: resolved.data };
    })
  );

  let nextData = data;
  let nextSchema = schema;
  for (const response of responses.filter(Boolean)) {
    const { link, responseData } = response;
    const mapped = await mapResponse(link, responseData, nextData, nextSchema);
    nextData = mapped.updatedData;
    nextSchema = mapped.updatedSchema;
  }

  return { nextData, nextSchema };
};

// ---------------------------------------------------------------------------
// Cache de template links (dependent)
// ---------------------------------------------------------------------------

const warmTemplateCache = async (
  links: HyperSchemaLink[],
  formData: AnyRecord,
  schema: JsonHyperSchema,
  cacheRef: MutableRefObject<AnyRecord>,
  useTestValues: boolean,
  runtimeValues: AnyRecord,
  notifyMissingExternalVariables: (link: HyperSchemaLink, missing: string[]) => void
) => {
  for (const [index, link] of links.entries()) {
    const params = buildTemplateParams(link, formData, schema);
    const linkKey = getLinkKey(link, index);
    if (hasTemplatePointers(link) && hasInvalidTemplateParams(link, params, schema)) {
      delete cacheRef.current[linkKey];
      continue;
    }
    const requestValues = mergeRuntimeValues(runtimeValues, formData);
    const missing = getMissingExternalVariables(link, requestValues, useTestValues);
    if (missing.length) {
      notifyMissingExternalVariables(link, missing);
      delete cacheRef.current[linkKey];
      continue;
    }
    cacheRef.current[linkKey] = await renderLinkUrl(
      link,
      requestValues,
      useTestValues
    );
  }
};

const runTemplateLinks = async (
  links: HyperSchemaLink[],
  formData: AnyRecord,
  schema: JsonHyperSchema,
  cacheRef: MutableRefObject<AnyRecord>,
  executeLink: (link: HyperSchemaLink, url: string, currentData: AnyRecord, requestValues?: AnyRecord) => Promise<any>,
  useTestValues: boolean,
  runtimeValues: AnyRecord,
  notifyMissingExternalVariables: (link: HyperSchemaLink, missing: string[]) => void
) => {
  for (const [index, link] of links.entries()) {
    const params = buildTemplateParams(link, formData, schema);
    const linkKey = getLinkKey(link, index);
    if (hasTemplatePointers(link) && hasInvalidTemplateParams(link, params, schema)) {
      delete cacheRef.current[linkKey];
      continue;
    }
    const requestValues = mergeRuntimeValues(runtimeValues, formData);
    const missing = getMissingExternalVariables(link, requestValues, useTestValues);
    if (missing.length) {
      notifyMissingExternalVariables(link, missing);
      delete cacheRef.current[linkKey];
      continue;
    }
    const url = await renderLinkUrl(link, requestValues, useTestValues);
    if (url === cacheRef.current[linkKey]) continue;
    cacheRef.current[linkKey] = url;
    await executeLink(link, url, formData, requestValues);
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
  useTestValues,
  runtimeValues,
  setInitialLinksReady,
  notifyMissingExternalVariables,
}) => {
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;

    const links = getSchemaLinks(initialSchema);
    const initLinks        = links.filter((l) => getLinkRole(l) === 'init');
    const catalogLinks     = links.filter((l) => getLinkRole(l) === 'catalog');
    const independentLinks = links.filter((l) => getLinkRole(l) === 'independent');

    if (!initLinks.length && !catalogLinks.length && !independentLinks.length) {
      hasLoaded.current = true;
      skipNextDependentSearch.current = true;
      setInitialLinksReady(true);
      return;
    }

    hasLoaded.current = true;

    const load = async () => {
      startLoading();
      try {
        let nextData   = { ...formData };
        let nextSchema = clone(currentSchema.current);

        if (initLinks.length) {
          const phase = await runLinkPhase(
            initLinks,
            nextData,
            nextSchema,
            mapResponse,
            service,
            useTestValues,
            runtimeValues,
            notifyMissingExternalVariables
          );
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
          setDataInput(nextData);
        }

        if (catalogLinks.length) {
          const phase = await runLinkPhase(
            catalogLinks,
            nextData,
            nextSchema,
            mapResponse,
            service,
            useTestValues,
            runtimeValues,
            notifyMissingExternalVariables
          );
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
        }

        if (independentLinks.length) {
          const phase = await runLinkPhase(
            independentLinks,
            nextData,
            nextSchema,
            mapResponse,
            service,
            useTestValues,
            runtimeValues,
            notifyMissingExternalVariables
          );
          nextData   = phase.nextData;
          nextSchema = phase.nextSchema;
        }

        currentSchema.current = nextSchema;
        skipNextDependentSearch.current = true;
        onUpdate(nextData, nextSchema);
      } catch (error) {
        console.error('[useJsonHyperSchema] Error en carga inicial:', error);
      } finally {
        skipNextDependentSearch.current = true;
        stopLoading();
        setInitialLinksReady(true);
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
  useTestValues,
  runtimeValues,
  initialLinksReady,
  notifyMissingExternalVariables,
}) => {
  useEffect(() => {
    if (!initialLinksReady) return;

    const links = getSchemaLinks(initialSchema).filter(
      (l) => getLinkRole(l) === 'dependent'
    );
    if (!links.length) return;

    if (skipNextDependentSearch.current) {
      warmTemplateCache(
        links,
        formData,
        currentSchema.current,
        lastTemplateRequestKeys,
        useTestValues,
        runtimeValues,
        notifyMissingExternalVariables
      )
        .finally(() => {
          skipNextDependentSearch.current = false;
        });
      return undefined;
    }

    const timer = setTimeout(() => {
      runTemplateLinks(
        links,
        formData,
        currentSchema.current,
        lastTemplateRequestKeys,
        executeLink,
        useTestValues,
        runtimeValues,
        notifyMissingExternalVariables
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
    initialLinksReady,
    useTestValues,
    runtimeValues,
  ]);
};

// ---------------------------------------------------------------------------
// Lógica condicional allOf / if-then-else
// ---------------------------------------------------------------------------

const useResolveLogic = () =>
  useCallback((currentData: AnyRecord, schema: JsonHyperSchema) => {
    const updatedSchema = clone(schema);
    const updatedData   = { ...currentData };

    (updatedSchema.allOf || []).forEach((block: AnyRecord) => {
      if (!block.if) return;
      const conditionEntry = Object.entries(block.if.properties || {})[0];
      if (!conditionEntry) return;

      const [key, constraints] = conditionEntry;
      const condition = constraints as AnyRecord;
      const val     = currentData[key];
      const isMatch =
        (condition.minimum === undefined || val >= condition.minimum) &&
        (condition.maximum === undefined || val <= condition.maximum);
      const branch  = isMatch ? block.then : block.else;

      if (branch?.properties) {
        Object.entries(branch.properties).forEach(([propKey, propValue]) => {
          const property = propValue as AnyRecord;
          if (property.const?.$data) {
            const sourcePath = property.const.$data.split('/').pop();
            if (updatedData[propKey] !== updatedData[sourcePath]) {
              updatedData[propKey] = updatedData[sourcePath];
            }
          }
          if (!updatedSchema.properties[propKey]) {
            updatedSchema.properties[propKey] = property;
          }
        });
      }
    });

    return { updatedData, updatedSchema };
  }, []);

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

type UseJsonHyperSchemaOptions = {
  service?: any;
  useTestValues?: boolean;
  values?: AnyRecord;
};

export function useJsonHyperSchema(
  initialSchema: JsonHyperSchema,
  formData: AnyRecord,
  onUpdate: (data: AnyRecord, schema?: JsonHyperSchema) => void,
  options: UseJsonHyperSchemaOptions = {}
) {
  const [loading, setLoading]   = useState(false);
  const [dataInput, setDataInput] = useState(null);
  const [initialLinksReady, setInitialLinksReady] = useState(false);
  const useTestValues = options.useTestValues !== false;
  const runtimeValues = options.values || {};

  const currentSchema            = useRef<JsonHyperSchema>(initialSchema);
  const lastTemplateRequestKeys  = useRef<AnyRecord>({});
  const skipNextDependentSearch  = useRef(false);
  const pendingRequests          = useRef(0);
  const missingExternalAlerts    = useRef<Set<string>>(new Set());

  // Service: si el caller inyecta uno, lo usa; si no, usa el default
  // (intenta red, fallback a valueTest).
  const serviceRef = useRef(options.service || buildDefaultService({ useTestValues }));

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

  const notifyMissingExternalVariables = useCallback((link, missing) => {
    const linkName = link.name || link.rel || link.id || getLinkUrl(link) || 'sin nombre';
    const alertKey = `${linkName}:${missing.join(',')}`;
    if (missingExternalAlerts.current.has(alertKey)) return;

    missingExternalAlerts.current.add(alertKey);
    window.alert(
      `Faltan variables externas para el link "${linkName}": ${missing.join(', ')}. ` +
      'Pásalas en useJsonHyperSchema(..., { values: { ... } }) o configúralas como testValues en modo prueba.'
    );
  }, []);

  const mapResponse = useCallback(
    async (link: HyperSchemaLink, responseData: any, currentData: AnyRecord, schema: JsonHyperSchema) => {
      let nextData   = { ...currentData };
      let nextSchema = clone(schema);

      for (const [target, source] of Object.entries(getResponseMapping(link))) {
        const mappingSource = source as any;
        if (typeof mappingSource === 'object' && mappingSource?.format) {
          nextData = applyFormatMapping(nextData, target, mappingSource, responseData);
          continue;
        }

        const isDefault = target.endsWith('/default') || target.endsWith('.default');
        const normalizedTarget = normalizeMappingTarget(target);
        const isEnum = normalizedTarget.endsWith('/enum');
        const isEnumNames = normalizedTarget.endsWith('/enumNames');
        const cleanTarget = isDefault
          ? normalizedTarget.slice(0, -'/default'.length)
          : normalizedTarget;

        if (isEnum && mappingSource && typeof mappingSource === 'object' && mappingSource.itemLabel) {
          const sourceArray = await resolveSource(
            responseData,
            { path: mappingSource.path || '$root' },
            currentData
          );
          const items = Array.isArray(sourceArray) ? sourceArray : [];
          const [values, labels] = await Promise.all([
            Promise.all(
              items.map((item) =>
                resolveItemTemplate(item, mappingSource.itemValue, responseData, currentData)
              )
            ),
            Promise.all(
              items.map((item) =>
                resolveItemTemplate(item, mappingSource.itemLabel, responseData, currentData)
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
          mappingSource,
          isDefault ? mappingSource : undefined,
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
    async (link, url, currentData, requestValues = currentData) => {
      startLoading();
      try {
        const resolved = await serviceRef.current.resolve({
          ...toExecutableLink(link, url),
          currentData: requestValues,
        });
        const mapped = await mapResponse(link, resolved.data, currentData, currentSchema.current);
        currentSchema.current = mapped.updatedSchema;
        onUpdate(mapped.updatedData, mapped.updatedSchema);
        return mapped;
      } catch (error) {
        console.error('[useJsonHyperSchema] Error ejecutando link:', link.rel || link.name, error);
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
    useTestValues,
    runtimeValues,
    setInitialLinksReady,
    notifyMissingExternalVariables,
  });

  useTemplateLinks({
    initialSchema,
    formData,
    currentSchema,
    executeLink,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
    useTestValues,
    runtimeValues,
    initialLinksReady,
    notifyMissingExternalVariables,
  });

  return { loading, dataInput };
}