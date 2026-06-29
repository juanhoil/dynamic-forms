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
          labelTpl: mapping[`${field}.enumNames`]?.itemValue || '',
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
export const targetsFromSchema = (schema) => {
  const links = schema?.links || [];
  return links.map((link, idx) => {
    const request = link.request || {};
    const response = link.response || {};

    const method = (request.method || link.method || 'GET').toUpperCase();
    const url = request.url || link.href || '';
    const mapping = response.responseMapping || link['x-responseMapping'] || link['x-response-mapping'] || {};
    const responseSchema = response.jsonSchema || link.targetSchema || {};
    const responseTest = response.testValues ?? link.valueTest;

    return {
      id: `t${idx + 1}`,
      method,
      name: link.name || url || `${method} /`,
      url,
      description: link.description || '',
      rel: link.rel || '',
      dataRole: link.dataRole || link['x-data-role'] || link['x-dataRole'] || '',
      templatePointers: link.templatePointers || {},
      // Configuración del request — cada pieza es un JSON Schema (+ testValues).
      request: {
        headers: request.headers || {},
        body: request.body || {},
        queryVariables: request.queryVariables || {},
        externalVariables: request.externalVariables || {},
        testValues: request.testValues || {},
      },
      // Response: el targetSchema se guarda como string para el editor de mapeo.
      schema: stringifySchema(responseSchema),
      testJSON: responseTest !== undefined ? JSON.stringify(responseTest, null, 2) : '',
      assignments: assignmentsFromMapping(mapping),
    };
  });
};
