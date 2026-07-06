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
//
// Links "dependent": un link se trata como dependiente automáticamente cuando
// usa variables del form ({{CP}}, {{form.CP}}...) en su url/headers/body. El
// hook vigila esos campos, los valida con AJV reutilizando el schema del form
// (type, minLength, pattern...) y sólo dispara la request cuando son válidos,
// tras `dependentDebounceMs` (3s por defecto) desde el último cambio.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import Ajv, { type ValidateFunction } from 'ajv';
import { renderTemplate, renderTemplateRecursive, renderTemplateValue } from '@/examples/inputVars/utils/TemplateExpressionEngineCEL';
import type { HyperSchemaLink, JsonHyperSchema } from '../../types';
import { createMockService } from '../services/mockService';
import { buildRequest } from '@/examples/http/utils/buildRequest';

type AnyRecord = Record<string, any>;
type LinkRole = 'init' | 'catalog' | 'dependent' | 'submit';

// ---------------------------------------------------------------------------
// Utilidades puras
// ---------------------------------------------------------------------------

const clone = (value: any) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const resolvePointer = (data: any, pointer: any) => {
  if (!pointer || pointer === '/' || pointer === '$root') return data;
  if (pointer === 'root' && Array.isArray(data)) return data;
  if (typeof pointer !== 'string') return pointer;
  return pointer
    .split('/')
    .filter(Boolean)
    .reduce((acc, key) => acc?.[key], data);
};

const setValue = (obj: any, pointer: string, value: any) => {
  const parts = pointer.split('/').filter(Boolean);
  if (!parts.length) return obj;

  const next = { ...obj };
  let current: AnyRecord = next;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    current[part] = { ...(current[part] || {}) };
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
  return next;
};

const isEmptyValue = (value: any) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

const getSchemaLinks = (schema: JsonHyperSchema): HyperSchemaLink[] => schema.links || [];

// ---------------------------------------------------------------------------
// Resolución de valores
// ---------------------------------------------------------------------------

export const buildTemplateScope = (responseData: any, inputValues: AnyRecord = {}, item?: any): AnyRecord => ({
  ...(inputValues || {}),
  ...(responseData && typeof responseData === 'object' && !Array.isArray(responseData)
    ? responseData
    : {}),
  ...(Array.isArray(responseData) ? { root: responseData } : {}),
  ...(item && typeof item === 'object' && !Array.isArray(item) ? item : {}),
  inputValues: inputValues || {},
  response: responseData,
  item,
});

export const resolveItemTemplate = async (
  item: any,
  template: any,
  responseData: any,
  inputValues: AnyRecord
) => {
  if (template === '$item') return item;
  if (typeof template === 'string' && template.includes('{{')) {
    return renderTemplate(template, buildTemplateScope(responseData, inputValues, item));
  }
  return resolvePointer(item, template);
};

export const resolveItemValue = async (
  item: any,
  source: AnyRecord,
  responseData: any,
  inputValues: AnyRecord
) => {
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

export const resolveSource = async (data: any, source: any, inputValues: AnyRecord = {}) => {
  if (typeof source === 'string') {
    if (source.includes('{{')) {
      return renderTemplateValue(source, buildTemplateScope(data, inputValues));
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
  const propertySchema = schema.properties?.[propertyName];
  const currentEnum =
    propertySchema && typeof propertySchema === 'object'
      ? propertySchema.enum
      : undefined;
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

/**
 * Resuelve la fuente de una colección: acepta un path (`settlements`, `root`)
 * o una expresión CEL completa (`{{settlements.filter(s, s.activo)}}`) que
 * devuelve el array crudo.
 */
const resolveArraySource = async (
  sourceExpr: any,
  responseData: any,
  inputValues: AnyRecord
) => {
  if (typeof sourceExpr !== 'string' || sourceExpr === '') {
    return resolvePointer(responseData, 'root');
  }
  if (sourceExpr.includes('{{')) {
    return renderTemplateValue(sourceExpr, buildTemplateScope(responseData, inputValues));
  }
  return resolvePointer(responseData, sourceExpr);
};

/**
 * Proyecta un array en `{ values, labels }` según el modelo `source` + `item`.
 *   - Sin `item`: array de valores simples → value = label = item.
 *   - Con `item.value`/`item.label`: proyección por elemento (CEL).
 * `item.value` preserva el tipo (número/boolean); `item.label` siempre string.
 */
export const resolveEnumObjectMapping = async (
  mappingSource: AnyRecord,
  responseData: any,
  currentData: AnyRecord
) => {
  const sourceArray = await resolveArraySource(mappingSource?.source, responseData, currentData);
  const items = Array.isArray(sourceArray) ? sourceArray : [];

  const item = (mappingSource?.item || {}) as { value?: string; label?: string };
  const hasProjection = Boolean(item.value || item.label);

  if (hasProjection) {
    const valueTpl = item.value || item.label || 'item';
    const labelTpl = item.label || item.value || 'item';
    const values: unknown[] = [];
    const labels: string[] = [];

    await Promise.all(
      items.map(async (entry) => {
        const scope = buildTemplateScope(responseData, currentData, entry);
        const [value, label] = await Promise.all([
          renderTemplateValue(valueTpl, scope),
          renderTemplate(labelTpl, scope),
        ]);
        if (!isEmptyValue(value)) values.push(value);
        if (!isEmptyValue(label)) labels.push(String(label));
      })
    );

    return { values, labels };
  }

  const values = items.filter((v) => !isEmptyValue(v));
  return { values, labels: values.map(String) };
};

const coerceToPropertyType = (value: unknown, propertySchema: unknown): unknown => {
  if (!propertySchema || typeof propertySchema !== 'object') return value;
  const schemaType = Array.isArray((propertySchema as AnyRecord).type)
    ? (propertySchema as AnyRecord).type[0]
    : (propertySchema as AnyRecord).type;

  if (schemaType === 'number' || schemaType === 'integer') {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return schemaType === 'integer' ? parseInt(value, 10) : Number(value);
    }
  }

  if (schemaType === 'boolean' && typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  return value;
};

const applyValueMapping = (
  data: AnyRecord,
  schema: JsonHyperSchema,
  cleanTarget: string,
  value: any,
  isDefault: boolean
) => {
  const propertyName = cleanTarget.split('/').filter(Boolean)[0];
  const propertySchema = propertyName ? schema.properties?.[propertyName] : undefined;
  const coercedValue = coerceToPropertyType(value, propertySchema);

  const nextData = setValue(data, cleanTarget, coercedValue);
  let nextSchema = ensureEnumContainsValue(schema, cleanTarget, coercedValue);
  if (!isDefault && !isEmptyValue(coercedValue)) {
    if (propertyName && nextSchema.properties?.[propertyName] !== undefined) {
      nextSchema = setValue(nextSchema, `/properties/${propertyName}/default`, coercedValue);
    }
  }
  return { nextData, nextSchema };
};

// ---------------------------------------------------------------------------
// templatePointers: JSON Schema de "qué valores espera" el link.
//
// Lo arma el editor (BaseConfigHTTP): al elegir una variable de form, su
// definición se agrega a `templatePointers.properties`. El hook NO parsea la
// URL; sólo lee este schema declarado y valida con AJV los campos del form:
// en `dependent` para saber si puede disparar al cambiar, y en `submit` para
// asegurar que los valores requeridos existan antes de enviar.
// ---------------------------------------------------------------------------

// Devuelve el schema de templatePointers si declara al menos una propiedad.
const getTemplatePointersSchema = (link: HyperSchemaLink): JsonHyperSchema | null => {
  const pointers = link.request?.templatePointers as JsonHyperSchema | undefined;
  if (
    pointers &&
    typeof pointers === 'object' &&
    pointers.properties &&
    Object.keys(pointers.properties).length > 0
  ) {
    return pointers;
  }
  return null;
};

// Campos del form declarados en templatePointers.
const getTemplatePointerFields = (link: HyperSchemaLink): string[] => {
  const pointers = getTemplatePointersSchema(link);
  return pointers ? Object.keys(pointers.properties || {}) : [];
};

// ---------------------------------------------------------------------------
// Validación con AJV contra el schema declarado en templatePointers
// ---------------------------------------------------------------------------

const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
const pointerValidatorCache = new Map<string, ValidateFunction>();

const getPointerValidator = (pointers: JsonHyperSchema): ValidateFunction => {
  const cacheKey = JSON.stringify(pointers);
  let validate = pointerValidatorCache.get(cacheKey);
  if (!validate) {
    validate = ajv.compile(pointers as AnyRecord);
    pointerValidatorCache.set(cacheKey, validate);
  }
  return validate;
};

// ¿Los valores actuales del form cumplen el schema declarado en
// templatePointers? Si el link no declara templatePointers, no hay nada que
// validar (true).
const areTemplatePointersValid = (link: HyperSchemaLink, formData: AnyRecord): boolean => {
  const pointers = getTemplatePointersSchema(link);
  if (!pointers) return true;

  const validate = getPointerValidator(pointers);
  const subset: AnyRecord = {};
  for (const field of Object.keys(pointers.properties || {})) {
    subset[field] = formData?.[field];
  }
  return validate(subset) === true;
};

// ---------------------------------------------------------------------------
// Clasificación de links
// ---------------------------------------------------------------------------

const INITIAL_LOAD_ROLES: LinkRole[] = ['init', 'catalog'];

const groupLinksByRole = (schema: JsonHyperSchema): Record<LinkRole, HyperSchemaLink[]> => {
  const grouped: Record<LinkRole, HyperSchemaLink[]> = {
    init: [],
    catalog: [],
    dependent: [],
    submit: [],
  };
  for (const link of getSchemaLinks(schema)) {
    grouped[link.dataRole].push(link);
  }
  return grouped;
};

// ---------------------------------------------------------------------------
// Helpers de links
// ---------------------------------------------------------------------------

const getLinkMethod = (link: HyperSchemaLink) => (link.request?.method || link.method || 'GET').toUpperCase();

const getResponseMapping = (link: HyperSchemaLink): AnyRecord =>
  link.response?.responseMapping || {};

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
  renderTemplate(getLinkUrl(link), buildRequestScope(link, values, useTestValues));

const buildRequestScope = (link: HyperSchemaLink, values: AnyRecord = {}, useTestValues = true) => {
  const inputValues = {
    ...(useTestValues ? link.request?.testValues || {} : {}),
    ...(values || {}),
  };

  return {
    form: inputValues,
    formData: inputValues,
    external: inputValues,
    externalVariables: inputValues,
    inputValues,
    ...inputValues,
  };
};

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

// ---------------------------------------------------------------------------
// Fetcher HTTP directo (usado como realFetcher por defecto del service)
// ---------------------------------------------------------------------------

const buildFetchBody = (data: any) => {
  if (data === undefined) return undefined;
  return typeof data === 'string' ? data : JSON.stringify(data);
};

const fetchLink = async (
  link: HyperSchemaLink,
  url: string,
  currentData: AnyRecord,
  useTestValues = true
) => {
  const method = getLinkMethod(link);
  const fetchOptions: RequestInit = { method };
  const requestValues = {
    ...(useTestValues ? link.request?.testValues || {} : {}),
    ...(currentData || {}),
  };
  const built = await buildRequest(
    { ...(link.request || {}), method, url },
    requestValues
  );

  if (built.headers) {
    fetchOptions.headers = built.headers as HeadersInit;
  }

  if (method !== 'GET' && method !== 'HEAD' && built.data !== undefined) {
    fetchOptions.body = buildFetchBody(built.data);
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
    return fetchLink(link, link.href, link.currentData || {}, useTestValues);
  };
  return createMockService({
    realFetcher,
    mode: useTestValues ? 'try-real-then-mock' : 'real-only',
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
      // En submit, templatePointers valida que los valores esperados del form
      // existan y cumplan su schema antes de ejecutar la request.
      if (!areTemplatePointersValid(link, data)) {
        return null;
      }
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

type TemplateLinkPrep =
  | { ok: false; linkKey: string }
  | { ok: true; linkKey: string; url: string; requestValues: AnyRecord };

const prepareTemplateLink = async (
  link: HyperSchemaLink,
  index: number,
  formData: AnyRecord,
  useTestValues: boolean,
  runtimeValues: AnyRecord,
  notifyMissingExternalVariables: (link: HyperSchemaLink, missing: string[]) => void
): Promise<TemplateLinkPrep> => {
  const linkKey = getLinkKey(link, index);

  // Los valores del form deben cumplir el schema declarado en templatePointers
  // (type, minLength, pattern...) antes de disparar la request.
  if (!areTemplatePointersValid(link, formData)) {
    return { ok: false, linkKey };
  }

  const requestValues = mergeRuntimeValues(runtimeValues, formData);
  const missing = getMissingExternalVariables(link, requestValues, useTestValues);
  if (missing.length) {
    notifyMissingExternalVariables(link, missing);
    return { ok: false, linkKey };
  }

  const url = await renderLinkUrl(link, requestValues, useTestValues);
  return { ok: true, linkKey, url, requestValues };
};

const getTemplateWatchKey = (links: HyperSchemaLink[], formData: AnyRecord) => {
  const fields = new Set<string>();
  for (const link of links) {
    getTemplatePointerFields(link).forEach((field) => fields.add(field));
  }
  return JSON.stringify([...fields].sort().map((field) => formData?.[field]));
};

// Recorre los links dependent y actualiza el cache de URLs. Si se pasa
// `executeLink`, además ejecuta la request cuando la URL cambió respecto al
// cache (modo runtime); sin él sólo "calienta" el cache (modo warm).
const processTemplateLinks = async (
  links: HyperSchemaLink[],
  formData: AnyRecord,
  cacheRef: MutableRefObject<AnyRecord>,
  useTestValues: boolean,
  runtimeValues: AnyRecord,
  notifyMissingExternalVariables: (link: HyperSchemaLink, missing: string[]) => void,
  executeLink?: (link: HyperSchemaLink, url: string, currentData: AnyRecord, requestValues?: AnyRecord) => Promise<any>
) => {
  for (const [index, link] of links.entries()) {
    const prep = await prepareTemplateLink(
      link,
      index,
      formData,
      useTestValues,
      runtimeValues,
      notifyMissingExternalVariables
    );
    if (!prep.ok) {
      delete cacheRef.current[prep.linkKey];
      continue;
    }
    if (executeLink) {
      if (prep.url === cacheRef.current[prep.linkKey]) continue;
      cacheRef.current[prep.linkKey] = prep.url;
      await executeLink(link, prep.url, formData, prep.requestValues);
    } else {
      cacheRef.current[prep.linkKey] = prep.url;
    }
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
  setError,
  skipNextDependentSearch,
  service,
  useTestValues,
  runtimeValues,
  setInitialLinksReady,
  notifyMissingExternalVariables,
  autoStart,
}) => {
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!autoStart) {
      setInitialLinksReady(true);
      return;
    }
    if (hasLoaded.current) return;

    const linksByRole = groupLinksByRole(initialSchema);
    const hasInitialLoad = INITIAL_LOAD_ROLES.some((role) => linksByRole[role].length > 0);

    if (!hasInitialLoad) {
      hasLoaded.current = true;
      skipNextDependentSearch.current = true;
      setInitialLinksReady(true);
      return;
    }

    hasLoaded.current = true;

    const load = async () => {
      startLoading();
      setError(null);
      try {
        let nextData   = { ...formData };
        let nextSchema = clone(currentSchema.current);

        for (const role of INITIAL_LOAD_ROLES) {
          const roleLinks = linksByRole[role];
          if (!roleLinks.length) continue;

          const phase = await runLinkPhase(
            roleLinks,
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
          if (role === 'init') setDataInput(nextData);
        }

        currentSchema.current = nextSchema;
        skipNextDependentSearch.current = true;
        onUpdate(nextData, nextSchema);
      } catch (error) {
        console.error('[useJsonHyperSchema] Error en carga inicial:', error);
        setError(error);
      } finally {
        skipNextDependentSearch.current = true;
        stopLoading();
        setInitialLinksReady(true);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, setInitialLinksReady]);
};

const useTemplateLinks = ({
  initialSchema,
  formData,
  executeLink,
  lastTemplateRequestKeys,
  skipNextDependentSearch,
  useTestValues,
  runtimeValues,
  initialLinksReady,
  notifyMissingExternalVariables,
  dependentDebounceMs,
}) => {
  const dependentLinks = useMemo(
    () => groupLinksByRole(initialSchema).dependent,
    [initialSchema]
  );
  const templateWatchKey = getTemplateWatchKey(dependentLinks, formData);

  useEffect(() => {
    if (!initialLinksReady) return;
    if (!dependentLinks.length) return;

    const links = dependentLinks;

    if (skipNextDependentSearch.current) {
      processTemplateLinks(
        links,
        formData,
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
      processTemplateLinks(
        links,
        formData,
        lastTemplateRequestKeys,
        useTestValues,
        runtimeValues,
        notifyMissingExternalVariables,
        executeLink
      );
    }, dependentDebounceMs);

    return () => clearTimeout(timer);
  }, [
    executeLink,
    dependentLinks,
    templateWatchKey,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
    initialLinksReady,
    useTestValues,
    runtimeValues,
    notifyMissingExternalVariables,
    dependentDebounceMs,
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

export type LinkRunResult =
  | { ok: true; data: AnyRecord; schema: JsonHyperSchema }
  | { ok: false; error: unknown };

export const formatLinkRunError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocurrió un error inesperado.';
};

type UseJsonHyperSchemaOptions = {
  service?: any;
  useTestValues?: boolean;
  values?: AnyRecord;
  autoStart?: boolean;
  dependentDebounceMs?: number;
};

const DEFAULT_DEPENDENT_DEBOUNCE_MS = 3000;

export function useJsonHyperSchema(
  initialSchema: JsonHyperSchema,
  formData: AnyRecord,
  onUpdate: (data: AnyRecord, schema?: JsonHyperSchema) => void,
  options: UseJsonHyperSchemaOptions = {}
) {
  const [loading, setLoading]   = useState(false);
  const [dataInput, setDataInput] = useState(null);
  const [error, setError] = useState<any>(null);
  const [initialLinksReady, setInitialLinksReady] = useState(false);
  const useTestValues = options.useTestValues === true;
  const runtimeValues = options.values || {};
  const autoStart = options.autoStart !== false;
  const dependentDebounceMs = options.dependentDebounceMs ?? DEFAULT_DEPENDENT_DEBOUNCE_MS;

  const currentSchema            = useRef<JsonHyperSchema>(initialSchema);
  const lastTemplateRequestKeys  = useRef<AnyRecord>({});
  const skipNextDependentSearch  = useRef(false);
  const pendingRequests          = useRef(0);
  const missingExternalAlerts    = useRef<Set<string>>(new Set());

  // Service: si el caller inyecta uno, lo usa; si no, usa el default
  // (intenta red, fallback a valueTest).
  const serviceRef = useRef(options.service || buildDefaultService({ useTestValues }));

  useEffect(() => {
    serviceRef.current = options.service || buildDefaultService({ useTestValues });
  }, [options.service, useTestValues]);

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
      let nextSchema = schema;

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

        if (isEnum && mappingSource && typeof mappingSource === 'object') {
          const { values, labels } = await resolveEnumObjectMapping(
            mappingSource,
            responseData,
            currentData
          );
          nextSchema = applyEnumMapping(nextSchema, target, values, labels);
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
        setError(null);
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
        setError(error);
        return null;
      } finally {
        stopLoading();
      }
    },
    [mapResponse, onUpdate, startLoading, stopLoading]
  );

  const runLinksByRole = useCallback(
    async (roles: LinkRole[]) => {
      startLoading();
      setError(null);
      try {
        const linksByRole = groupLinksByRole(initialSchema);
        const hasRequestedLinks = roles.some((role) => linksByRole[role].length > 0);
        if (!hasRequestedLinks) {
          return { ok: true, data: formData, schema: currentSchema.current };
        }

        let nextData = { ...formData };
        let nextSchema = clone(currentSchema.current);

        for (const role of roles) {
          const roleLinks = linksByRole[role];
          if (!roleLinks.length) continue;

          const phase = await runLinkPhase(
            roleLinks,
            nextData,
            nextSchema,
            mapResponse,
            serviceRef.current,
            useTestValues,
            runtimeValues,
            notifyMissingExternalVariables
          );

          nextData = phase.nextData;
          nextSchema = phase.nextSchema;
        }

        currentSchema.current = nextSchema;
        onUpdate(nextData, nextSchema);
        return { ok: true, data: nextData};
      } catch (err) {
        console.error('[useJsonHyperSchema] Error ejecutando roles:', roles, err);
        setError(err);
        return { ok: false, error: err };
      } finally {
        stopLoading();
      }
    },
    [
      formData,
      initialSchema,
      mapResponse,
      notifyMissingExternalVariables,
      onUpdate,
      runtimeValues,
      startLoading,
      stopLoading,
      useTestValues,
    ]
  );

  const submit = useCallback(() => runLinksByRole(['submit']), [runLinksByRole]);

  const start = useCallback(
    () => runLinksByRole(['init', 'catalog']),
    [runLinksByRole]
  );

  const reload = start;

  const reset = useCallback(() => {
    currentSchema.current = initialSchema;
    lastTemplateRequestKeys.current = {};
    skipNextDependentSearch.current = true;
    pendingRequests.current = 0;
    missingExternalAlerts.current.clear();
    setDataInput(null);
    setError(null);
    setLoading(false);
    setInitialLinksReady(false);
    onUpdate(formData, initialSchema);
  }, [formData, initialSchema, onUpdate]);

  useInitialLinks({
    initialSchema,
    formData,
    currentSchema,
    mapResponse,
    onUpdate,
    startLoading,
    stopLoading,
    setDataInput,
    setError,
    skipNextDependentSearch,
    service: serviceRef.current,
    useTestValues,
    runtimeValues,
    setInitialLinksReady,
    notifyMissingExternalVariables,
    autoStart,
  });

  useTemplateLinks({
    initialSchema,
    formData,
    executeLink,
    lastTemplateRequestKeys,
    skipNextDependentSearch,
    useTestValues,
    runtimeValues,
    initialLinksReady,
    notifyMissingExternalVariables,
    dependentDebounceMs,
  });

  return { loading, dataInput, submit, error, start, reset, reload };
}