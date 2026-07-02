// Tipos compartidos del módulo http.

export type { HyperSchemaLink, HyperSchemaRequest, JsonSchema, JsonValue } from '@/examples/forms/types';
import type { HyperSchemaRequest, JsonSchema } from '@/examples/forms/types';

export type JsonSchemaLike = JsonSchema | boolean;

// El editor HTTP configura exactamente el bloque `request` de un HyperSchemaLink.
export type HttpConfig = HyperSchemaRequest;

export type TestValues = Record<string, unknown>;
