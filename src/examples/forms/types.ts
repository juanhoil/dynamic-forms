export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema | boolean>;
  items?: JsonSchema | JsonSchema[] | boolean;
  required?: string[];
  oneOf?: Array<JsonSchema | boolean>;
  anyOf?: Array<JsonSchema | boolean>;
  allOf?: Array<JsonSchema | boolean>;
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  enumNames?: string[];
  readOnly?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean | JsonSchema;
  [keyword: string]: unknown;
}

export type HyperSchemaLinkRole = 'init' | 'catalog' | 'dependent' | 'independent' | 'submit';

export type ResponseMappingSource =
  | string
  | {
      path?: string;
      item?: unknown;
      itemValue?: string;
      itemLabel?: string;
      stringify?: boolean;
      format?: string;
      [key: string]: unknown;
    };

export interface HyperSchemaRequest {
  method: string;
  url: string;
  headers: JsonSchema | Record<string, unknown>;
  body: JsonSchema | Record<string, unknown>;
  queryVariables: JsonSchema | Record<string, unknown>;
  externalVariables: JsonSchema | Record<string, unknown>;
  templatePointers?: Record<string, string>;
  testValues: Record<string, unknown>;
  [key: string]: unknown;
}

export interface HyperSchemaResponse {
  jsonSchema?: JsonSchema | null;
  testValues?: unknown;
  responseMapping: Record<string, ResponseMappingSource>;
  [key: string]: unknown;
}

export interface HyperSchemaLink {
  id?: string;
  name?: string;
  description?: string;
  rel?: string;
  href?: string;
  method?: string;
  url?: string;
  dataRole?: HyperSchemaLinkRole | string;
  request: HyperSchemaRequest;
  response: HyperSchemaResponse;
  targetSchema?: JsonSchema;
  valueTest?: unknown;
  assignments?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface JsonHyperSchema extends JsonSchema {
  links?: HyperSchemaLink[];
}
