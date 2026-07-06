import type {
  JsonSchema,
  JsonSchemaPrimitive,
  JsonSchemaValue,
} from '@/examples/jsonSchemasBuilder2/components/interface.JsonSchemaBuilder';

export type JsonPrimitive = JsonSchemaPrimitive;
export type JsonValue = JsonSchemaValue;
export type { JsonSchema };

export type HyperSchemaLinkRole = 'init' | 'catalog' | 'dependent' | 'submit';

/**
 * Proyección por elemento de una colección: cómo cada item se convierte en
 * el `value` y el `label` de una opción. Ambos aceptan expresiones CEL
 * (`{{id}}`, `{{nombre}} {{apellido}}`) evaluadas en el scope del item.
 */
export interface ResponseMappingItem {
  value?: string;
  label?: string;
}

/**
 * Fuente de un mapping de respuesta. Dos conceptos separados:
 *   - `source`: de dónde sale el valor/colección (path `settlements`, `root`,
 *     o expresión CEL `{{settlements.filter(s, s.activo)}}`).
 *   - `item`: cómo proyectar cada elemento (value/label) cuando es colección.
 *
 * Un string suelto es azúcar para `{ source: string }` (usado en `.default`).
 */
export type ResponseMappingSource =
  | string
  | {
      source?: string;
      item?: ResponseMappingItem;
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
  templatePointers?: JsonSchema;
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
  dataRole: HyperSchemaLinkRole; 
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
