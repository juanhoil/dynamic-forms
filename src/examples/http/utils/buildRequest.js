// ---------------------------------------------------------------------------
// buildRequest — turn an httpConfig + testValues into a ready-to-send request.
//
// `testValues` is the single source of concrete values. Every `{{token}}`
// found in the URL (path AND query string), body and header values is replaced
// from it. The query string is written inline in the URL, e.g.
// `todos/1?id={{id}}` → `todos/1?id=1`; `queryVariables` is only a declaration
// of available variables (feeds the chips), it does NOT auto-append params.
//
// `body` and `headers` are JSON Schemas: each declared property name is the
// body field / header name, and its value is pulled from testValues.
//
// Returns the axios-friendly shape: { method, url, data, headers }.
// ---------------------------------------------------------------------------

import { renderTemplate, renderTemplateRecursive } from './template.js';

// Scope compartido para resolver los `{{tokens}}` de una request. Se exporta
// para que el editor (RequestSection) valide tokens con el mismo contexto.
export const buildScope = (testValues) => ({
  form: {},
  ...(testValues || {})
});

const isObjectSchema = (schema) =>
  schema && typeof schema === 'object' && schema.type === 'object' && schema.properties;

// Build an object from the declared schema properties present in testValues,
// then resolve any `{{token}}` inside the values via CEL. Empty schema → undefined.
const buildObjectFromSchema = async (schema, scope, testValues) => {
  if (!isObjectSchema(schema) || Object.keys(schema.properties).length === 0) {
    return undefined;
  }
  const out = {};
  for (const key of Object.keys(schema.properties)) {
    if (key in (testValues || {})) {
      out[key] = testValues[key];
    }
  }
  return renderTemplateRecursive(out, scope);
};

export const buildRequest = async (config = {}, testValues = {}) => {
  const scope = buildScope(testValues);

  const method = (config.method || 'GET').toLowerCase();
  const url = await renderTemplate(config.url || '', scope);
  const headers = await buildObjectFromSchema(config.headers, scope, testValues);

  const bodyPayload = await buildObjectFromSchema(config.body, scope, testValues);
  const data = (method === 'get' || method === 'delete' || method === 'head')
    ? undefined
    : bodyPayload;

  return { method, url, data, headers };
};

export default buildRequest;
