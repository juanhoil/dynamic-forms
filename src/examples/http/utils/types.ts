// Tipos compartidos del módulo http.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Representación laxa de un JSON Schema. Sólo declaramos las propiedades que
// el módulo http realmente lee; el index signature permite el resto.
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema | boolean>;
  items?: JsonSchema | boolean;
  required?: string[];
  oneOf?: Array<JsonSchema | boolean>;
  anyOf?: Array<JsonSchema | boolean>;
  allOf?: Array<JsonSchema | boolean>;
  format?: string;
  title?: string;
  description?: string;
  minItems?: number;
  maxItems?: number;
  default?: unknown;
  [key: string]: unknown;
}

export type JsonSchemaLike = JsonSchema | boolean;

// Configuración de una request del editor http (httpConfig).
export interface HttpConfig {
  method?: string;
  url?: string;
  headers?: JsonSchema;
  body?: JsonSchema;
  queryVariables?: JsonSchema;
  externalVariables?: JsonSchema;
  [key: string]: unknown;
}

export type TestValues = Record<string, unknown>;
