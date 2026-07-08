// ---------------------------------------------------------------------------
// hyperSchemaResolver — motor de resolución de un JsonHyperSchema.
//
// Versión backend (framework-agnostic) de la lógica pura que en el frontend
// vivía dentro del hook `useJsonHyperSchema`. Aquí NO hay React ni efectos
// reactivos: se expone una función que, dado un schema + formData + los roles
// a ejecutar, resuelve cada link contra su servicio (red real y/o mock),
// aplica los `responseMapping` sobre el schema/data y devuelve el resultado.
//
// Roles:
//   - init / catalog : carga inicial (equivalente a start()/reload()).
//   - dependent      : links que dependen de campos del form ({{CP}}...).
//   - submit         : links de envío.
//
// Un link se valida con AJV contra su `templatePointers` (type, minLength,
// pattern...) y sólo se ejecuta si los valores del form cumplen ese schema y
// no faltan variables externas requeridas.
// ---------------------------------------------------------------------------

import { Ajv, type ValidateFunction } from 'ajv';
import {
  renderTemplate,
  renderTemplateRecursive,
  renderTemplateValue,
} from '../utils/templateEngine.js';
import { buildRequest } from '../utils/buildRequest.js';
import { clone, isEmptyValue, resolvePointer, setValue } from '../utils/pointer.js';
import { createMockService, type HyperSchemaService } from './mockService.js';
import type { HyperSchemaLink, JsonHyperSchema } from '../types.js';

type AnyRecord = Record<string, any>;
export type LinkRole = 'init' | 'catalog' | 'dependent' | 'submit';

// ---------------------------------------------------------------------------
// Resolución de valores
// ---------------------------------------------------------------------------

const getSchemaLinks = (schema: JsonHyperSchema): HyperSchemaLink[] => schema.links || [];

export const buildTemplateScope = (
  responseData: any,
  inputValues: AnyRecord = {},
  item?: any
): AnyRecord => ({
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

const normalizeValue = async (
  value: any,
  source: AnyRecord,
  responseData: any,
  inputValues: AnyRecord
) => {
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
    propertySchema && typeof propertySchema === 'object' ? propertySchema.enum : undefined;
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
    (_: string, pointer: string) => resolvePointer(responseData, pointer) ?? ''
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
 * o una expresión CEL completa (`{{settlements.filter(s, s.activo)}}`).
 */
const resolveArraySource = async (sourceExpr: any, responseData: any, inputValues: AnyRecord) => {
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
// ---------------------------------------------------------------------------

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

const getLinkMethod = (link: HyperSchemaLink) =>
  (link.request?.method || link.method || 'GET').toUpperCase();

const getResponseMapping = (link: HyperSchemaLink): AnyRecord =>
  link.response?.responseMapping || {};

const getLinkUrl = (link: HyperSchemaLink) => link.request?.url || link.href || '';

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

const buildRequestScope = (link: HyperSchemaLink, values: AnyRecord = {}, useTestValues = true): AnyRecord => {
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

const renderLinkUrl = (link: HyperSchemaLink, values: AnyRecord = {}, useTestValues = true) =>
  renderTemplate(getLinkUrl(link), buildRequestScope(link, values, useTestValues));

const getExternalVariableNames = (link: HyperSchemaLink): string[] => {
  const externalVariables = link.request?.externalVariables as AnyRecord | undefined;
  const properties = externalVariables?.properties || {};
  if (Array.isArray(externalVariables?.required) && externalVariables?.required?.length) {
    return externalVariables.required;
  }
  return Object.keys(properties);
};

const getMissingExternalVariables = (
  link: HyperSchemaLink,
  values: AnyRecord = {},
  useTestValues = true
) => {
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
  const requestValues = {
    ...(useTestValues ? link.request?.testValues || {} : {}),
    ...(currentData || {}),
  };
  const built = await buildRequest({ ...(link.request || {}), method, url }, requestValues);

  const fetchOptions: { method: string; headers?: Record<string, string>; body?: string } = {
    method,
  };

  if (built.headers) {
    fetchOptions.headers = built.headers as Record<string, string>;
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

const buildDefaultService = ({ useTestValues = true }: { useTestValues?: boolean } = {}): HyperSchemaService => {
  const realFetcher = (link: any) =>
    fetchLink(link, link.href || '', (link as AnyRecord).currentData || {}, useTestValues);
  return createMockService({
    realFetcher,
    mode: useTestValues ? 'try-real-then-mock' : 'real-only',
    useTestValues,
  });
};

// ---------------------------------------------------------------------------
// Lógica condicional allOf / if-then-else
// ---------------------------------------------------------------------------

const resolveLogic = (currentData: AnyRecord, schema: JsonHyperSchema) => {
  const updatedSchema = clone(schema) as AnyRecord;
  const updatedData: AnyRecord = { ...currentData };

  (updatedSchema.allOf || []).forEach((block: AnyRecord) => {
    if (!block.if) return;
    const conditionEntry = Object.entries(block.if.properties || {})[0];
    if (!conditionEntry) return;

    const [key, constraints] = conditionEntry;
    const condition = constraints as AnyRecord;
    const val = currentData[key];
    const isMatch =
      (condition.minimum === undefined || val >= condition.minimum) &&
      (condition.maximum === undefined || val <= condition.maximum);
    const branch = isMatch ? block.then : block.else;

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

  return { updatedData, updatedSchema: updatedSchema as JsonHyperSchema };
};

// ---------------------------------------------------------------------------
// mapResponse: aplica el responseMapping de un link sobre data + schema.
// ---------------------------------------------------------------------------

const mapResponse = async (
  link: HyperSchemaLink,
  responseData: any,
  currentData: AnyRecord,
  schema: JsonHyperSchema
) => {
  let nextData: AnyRecord = { ...currentData };
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
    nextData = mapped.nextData;
    nextSchema = mapped.nextSchema;
  }

  const { updatedData, updatedSchema } = resolveLogic(nextData, nextSchema);
  return { updatedData, updatedSchema };
};

// ---------------------------------------------------------------------------
// Ejecución de una fase de links (un rol)
// ---------------------------------------------------------------------------

const runLinkPhase = async (
  links: HyperSchemaLink[],
  data: AnyRecord,
  schema: JsonHyperSchema,
  service: HyperSchemaService,
  useTestValues: boolean,
  runtimeValues: AnyRecord,
  notifyMissingExternalVariables: (link: HyperSchemaLink, missing: string[]) => void
) => {
  const responses = await Promise.all(
    links.map(async (link) => {
      // templatePointers valida que los valores esperados del form existan y
      // cumplan su schema antes de ejecutar la request.
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
  for (const response of responses.filter(Boolean) as Array<{
    link: HyperSchemaLink;
    responseData: any;
  }>) {
    const { link, responseData } = response;
    const mapped = await mapResponse(link, responseData, nextData, nextSchema);
    nextData = mapped.updatedData;
    nextSchema = mapped.updatedSchema;
  }

  return { nextData, nextSchema };
};

// ---------------------------------------------------------------------------
// API pública del motor
// ---------------------------------------------------------------------------

export interface ResolveOptions {
  /** Servicio de resolución de links. Por defecto: red real con fallback a mock. */
  service?: HyperSchemaService;
  /** Si true, usa los `testValues`/`valueTest` declarados en cada link. Default false. */
  useTestValues?: boolean;
  /** Variables externas de runtime (equivale al `values` del hook). */
  values?: AnyRecord;
}

export interface ResolveResult {
  /** Data del formulario tras aplicar los mappings. */
  data: AnyRecord;
  /** Schema resuelto (con enums/defaults inyectados). Incluye `links`. */
  schema: JsonHyperSchema;
  /** Schema sin `links`, listo para entregar a un renderer de formularios. */
  schemaWithoutLinks: JsonHyperSchema;
  /** Avisos de variables externas faltantes por link. */
  warnings: string[];
}

const DEFAULT_ROLES: LinkRole[] = ['init', 'catalog'];

/**
 * Ejecuta los links del schema para los roles indicados y devuelve el schema
 * y la data resueltos. Función pura y sin estado: cada llamada es autónoma.
 *
 * @example
 *   const { schemaWithoutLinks, data } = await resolveLinks(hyperSchema, {}, ['init', 'catalog']);
 */
export async function resolveLinks(
  schema: JsonHyperSchema,
  formData: AnyRecord = {},
  roles: LinkRole[] = DEFAULT_ROLES,
  options: ResolveOptions = {}
): Promise<ResolveResult> {
  const useTestValues = options.useTestValues ?? false;
  const runtimeValues = options.values || {};
  const service = options.service || buildDefaultService({ useTestValues });

  const warnings = new Set<string>();
  const notifyMissingExternalVariables = (link: HyperSchemaLink, missing: string[]) => {
    const linkName = link.name || link.rel || link.id || getLinkUrl(link) || 'sin nombre';
    warnings.add(
      `Faltan variables externas para el link "${linkName}": ${missing.join(', ')}.`
    );
  };

  const linksByRole = groupLinksByRole(schema);

  let nextData: AnyRecord = { ...formData };
  let nextSchema = clone(schema) as JsonHyperSchema;

  for (const role of roles) {
    const roleLinks = linksByRole[role];
    if (!roleLinks || !roleLinks.length) continue;

    const phase = await runLinkPhase(
      roleLinks,
      nextData,
      nextSchema,
      service,
      useTestValues,
      runtimeValues,
      notifyMissingExternalVariables
    );
    nextData = phase.nextData;
    nextSchema = phase.nextSchema;
  }

  const { links: _links, ...schemaWithoutLinks } = nextSchema;

  return {
    data: nextData,
    schema: nextSchema,
    schemaWithoutLinks: schemaWithoutLinks as JsonHyperSchema,
    warnings: Array.from(warnings),
  };
}

/** Carga inicial: resuelve los roles `init` y `catalog`. */
export const resolveInitial = (
  schema: JsonHyperSchema,
  formData: AnyRecord = {},
  options: ResolveOptions = {}
) => resolveLinks(schema, formData, ['init', 'catalog'], options);

/** Resuelve los links `dependent` para los valores actuales del form. */
export const resolveDependent = (
  schema: JsonHyperSchema,
  formData: AnyRecord = {},
  options: ResolveOptions = {}
) => resolveLinks(schema, formData, ['dependent'], options);

/** Ejecuta los links `submit`. */
export const resolveSubmit = (
  schema: JsonHyperSchema,
  formData: AnyRecord = {},
  options: ResolveOptions = {}
) => resolveLinks(schema, formData, ['submit'], options);
