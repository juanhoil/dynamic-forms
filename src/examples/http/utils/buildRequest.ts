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
// body field / header name, and its value is pulled from testValues or the
// schema default.
//
// Returns the axios-friendly shape: { method, url, data, headers }.
// ---------------------------------------------------------------------------

import { renderTemplate, renderTemplateRecursive, renderTemplateValue, type Scope } from '@/examples/inputVars/utils/TemplateExpressionEngineCEL';
import type { HttpConfig, JsonSchema, TestValues } from './types';

export interface BuiltRequest {
  method: string;
  url: string;
  data: unknown;
  headers: Record<string, unknown> | undefined;
}

// Scope compartido para resolver los `{{tokens}}` de una request. Se exporta
// para que el editor (RequestSection) valide tokens con el mismo contexto.
export const buildScope = (testValues?: TestValues): Scope => {
  const values = testValues || {};
  return {
    form: values,
    formData: values,
    external: values,
    externalVariables: values,
    inputValues: values,
    ...values,
  };
};

const isObjectSchema = (schema: unknown): schema is JsonSchema =>
  Boolean(
    schema &&
      typeof schema === 'object' &&
      (schema as JsonSchema).type === 'object' &&
      (schema as JsonSchema).properties
  );

// Build an object from the declared schema properties present in testValues,
// then resolve any `{{token}}` inside the values via CEL. Empty schema → undefined.
const buildObjectFromSchema = async (
  schema: JsonSchema | undefined,
  scope: Scope,
  testValues: TestValues
): Promise<Record<string, unknown> | undefined> => {
  if (!isObjectSchema(schema) || Object.keys(schema.properties ?? {}).length === 0) {
    return undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, rawProp] of Object.entries(schema.properties ?? {})) {
    if (key in (testValues || {})) {
      out[key] = testValues[key];
      continue;
    }

    if (rawProp && typeof rawProp === 'object' && 'default' in rawProp) {
      out[key] = (rawProp as JsonSchema).default;
    }
  }
  return (await renderTemplateRecursive(out, scope)) as Record<string, unknown>;
};

export const buildRequest = async (
  config: Partial<HttpConfig> = {},
  testValues: TestValues = {}
): Promise<BuiltRequest> => {
  const scope = buildScope(testValues);

  const method = (config.method || 'GET').toLowerCase();
  const url = await renderTemplate(config.url || '', scope);
  const headers = await buildObjectFromSchema(config.headers, scope, testValues);

  const bodyPayload = await buildObjectFromSchema(config.body, scope, testValues);
  const data =
    method === 'get' || method === 'delete' || method === 'head'
      ? undefined
      : bodyPayload;

  return { method, url, data, headers };
};
