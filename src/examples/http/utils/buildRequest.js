// ---------------------------------------------------------------------------
// buildRequest — turn an httpConfig + testValues into a ready-to-send request.
//
// `testValues` is the single source of concrete values. Every `{{token}}`
// found in the URL, body payload and headers is replaced from it. Query params
// are derived from the `queryVariables` schema (property name = param name,
// value pulled from testValues).
//
// Returns the axios-friendly shape: { method, url, params, data, headers }.
// ---------------------------------------------------------------------------

import { resolveTemplates } from './resolveTemplates.js';

const buildScope = (testValues) => ({
  form: {},
  ...(testValues || {})
});

const isObjectSchema = (schema) =>
  schema && typeof schema === 'object' && schema.type === 'object' && schema.properties;

// Each declared property becomes a query param; its value comes from
// testValues by the same key (and gets template-resolved too).
const buildParams = (schema, scope, testValues) => {
  const params = {};
  if (!isObjectSchema(schema)) return params;
  for (const key of Object.keys(schema.properties)) {
    const v = testValues?.[key];
    if (v === undefined) continue;
    const resolved = resolveTemplates(v, scope);
    params[key] = typeof resolved === 'object' ? JSON.stringify(resolved) : resolved;
  }
  return params;
};

// Build the payload from the declared body properties present in testValues,
// then resolve any `{{token}}` inside the values. Empty schema → no body.
const buildBody = (schema, scope, testValues) => {
  if (!isObjectSchema(schema) || Object.keys(schema.properties).length === 0) {
    return undefined;
  }
  const payload = {};
  for (const key of Object.keys(schema.properties)) {
    if (key in (testValues || {})) {
      payload[key] = testValues[key];
    }
  }
  return resolveTemplates(payload, scope);
};

export const buildRequest = (config = {}, testValues = {}) => {
  const scope = buildScope(testValues);

  const method = (config.method || 'GET').toLowerCase();
  const url = resolveTemplates(config.url || '', scope);
  const params = buildParams(config.queryVariables, scope, testValues);

  // headers: a plain key/value object whose values may contain {{tokens}}.
  const headers = config.headers
    ? resolveTemplates(config.headers, scope)
    : undefined;

  const bodyPayload = buildBody(config.body, scope, testValues);
  const data = (method === 'get' || method === 'delete' || method === 'head')
    ? undefined
    : bodyPayload;

  return { method, url, params, data, headers };
};

export default buildRequest;
