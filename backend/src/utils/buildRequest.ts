// ---------------------------------------------------------------------------
// buildRequest — convierte un httpConfig + testValues en una request lista
// para enviar.
//
// `testValues` es la única fuente de valores concretos. Cada `{{token}}` que
// aparezca en la URL (path Y query string), body y headers se reemplaza desde
// ahí. `queryVariables` es sólo una declaración de variables disponibles, NO
// añade params automáticamente.
//
// `body` y `headers` son JSON Schemas: cada propiedad declarada es el campo
// del body / nombre de header, y su valor sale de testValues o del default.
//
// Devuelve la forma amigable para axios/fetch: { method, url, data, headers }.
// ---------------------------------------------------------------------------

import {
  renderTemplate,
  renderTemplateRecursive,
  type Scope,
} from './templateEngine.js';
import type { HttpConfig, JsonSchema, TestValues } from '../types.js';

export interface BuiltRequest {
  method: string;
  url: string;
  data: unknown;
  headers: Record<string, unknown> | undefined;
}

// Scope compartido para resolver los `{{tokens}}` de una request.
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

// Construye un objeto a partir de las propiedades declaradas presentes en
// testValues, luego resuelve cualquier `{{token}}` en los valores vía CEL.
const buildObjectFromSchema = async (
  schema: JsonSchema | Record<string, unknown> | undefined,
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
