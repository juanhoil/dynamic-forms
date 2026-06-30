// ---------------------------------------------------------------------------
// Adapter: convierte el `links[]` del schema (nuevo formato request/response,
// donde toda la configuración es un JSON Schema) al formato plano de "target"
// que consume el editor.
//
// Formato de entrada (shcemas.js):
//   {
//     name, description, dataRole,
//     request:  { method, url, headers, body, queryVariables, externalVariables, testValues },
//     response: { jsonSchema, testValues, responseMapping }
//   }
//
// También acepta el formato viejo de hyperschema (href, method, targetSchema,
// x-responseMapping, valueTest) para retrocompatibilidad.
// ---------------------------------------------------------------------------

import { buildMappingJSON } from '../utils/mapping';

const safeParseJSON = (value) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const stringifySchema = (value) =>
  value && Object.keys(value).length ? JSON.stringify(value, null, 2) : '';

/**
 * Convierte un mapping `{ 'Campo.default': '...', 'Campo.enum': {...} }`
 * al modelo de `assignments` que usa el editor.
 */
const assignmentsFromMapping = (mapping = {}) => {
  const assignments = {};
  Object.entries(mapping).forEach(([key, source]) => {
    const [field, kind] = key.split('.');
    if (!field) return;
    if (kind === 'default') {
      assignments[field] = { type: 'default', sourceTpl: String(source) };
    } else if (kind === 'enum') {
      if (source && typeof source === 'object') {
        assignments[field] = {
          type: 'select',
          enumSource: source.path || '$root',
          valueTpl: source.itemValue || '',
          labelTpl:
            source.itemLabel ||
            mapping[`${field}.enumNames`]?.itemValue ||
            '',
        };
      } else {
        assignments[field] = {
          type: 'select',
          enumSource: String(source),
          valueTpl: '$item',
          labelTpl: '$item',
        };
      }
    }
  });
  return assignments;
};

/**
 * Lee el `links[]` del schema y devuelve el array de targets para el editor.
 * Conserva la configuración del request (headers/body/queryVariables como JSON
 * Schemas + testValues) y la del response (jsonSchema, testValues, mapping).
 */


/**
 * Convierte un target editado de vuelta al formato `links[]` del schema final.
 */
export const linkFromTarget = (target) => {
  const mapping = buildMappingJSON(target);
  const testValues = safeParseJSON(target.testJSON);

  return {
    rel: target.rel || target.method.toLowerCase(),
    href: target.url || target.name,
    method: target.method,
    name: target.name,
    description: target.description,
    ...(target.dataRole ? { 'dataRole  ': target.dataRole } : {}),
    ...(target.templatePointers && Object.keys(target.templatePointers).length
      ? { templatePointers: target.templatePointers }
      : {}),
    request: {
      ...(target.request || {}),
      method: target.method,
      url: target.url,
    },
    response: {
      jsonSchema: mapping.targetSchema,
      responseMapping: mapping['x-responseMapping'],
      ...(testValues !== undefined ? { testValues } : {}),
    },
    targetSchema: mapping.targetSchema,
    'x-responseMapping': mapping['x-responseMapping'],
    ...(testValues !== undefined ? { valueTest: testValues } : {}),
  };
};
