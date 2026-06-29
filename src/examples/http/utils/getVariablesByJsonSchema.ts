// ---------------------------------------------------------------------------
// getVariablesByJsonSchema — extract variable names from JSON Schema objects.
//
// Used by the httpConfig editor (exampleHR1) to enumerate the property paths
// declared across `body`, `queryVariables`, and `externalVariables` schemas.
// The result feeds UI affordances like "available variables" chips under the
// URL field, or anywhere else we need to know what `{{...}}` tokens could
// legally exist.
//
// Shape contract (matching the new httpConfig):
//   { type: 'object', properties: { <name>: { type: 'string' | 'number' | ... } } }
//
// Returned paths are dot-separated for nested objects, e.g.
//   { properties: { user: { type: 'object', properties: { id: { type: 'number' } } } } }
//   → ['user', 'user.id']
//
// Limitations (documented):
//   - $ref, oneOf, anyOf, allOf, not are NOT resolved (would need a full
//     schema resolver). They are skipped to avoid false positives.
//   - additionalProperties / patternProperties are NOT enumerated (their keys
//     are unknown by definition).
//   - Recursion is capped via `options.maxDepth` (default 4) to avoid runaway
//     descent through cyclic or pathological schemas.
// ---------------------------------------------------------------------------

import type { JsonSchema, JsonSchemaLike } from './types';

const SKIP_KEYS = new Set(['$ref', 'oneOf', 'anyOf', 'allOf', 'not']);

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const looksLikeObjectSchema = (s: unknown): s is JsonSchema =>
  isObj(s) && (s.type === 'object' || (!s.type && Boolean(s.properties)));

const extractFromOne = (
  schema: JsonSchemaLike | null | undefined,
  prefix: string,
  out: Set<string>,
  depth: number
): void => {
  if (!looksLikeObjectSchema(schema) || depth <= 0) return;

  const props = schema.properties;
  if (!isObj(props)) return;

  for (const [key, child] of Object.entries(props)) {
    if (SKIP_KEYS.has(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    out.add(path);

    // Recurse only if the child is itself an object schema (nested object).
    if (looksLikeObjectSchema(child)) {
      extractFromOne(child, path, out, depth - 1);
    }
  }
};

export interface GetVariablesOptions {
  maxDepth?: number;
}

/**
 * Extract a flat, deduped, alphabetically-sorted list of property paths from
 * one or more JSON Schema objects.
 *
 * `maxDepth` caps recursion depth (default 4). Returns [] for null/undefined/empty.
 */
export const getVariablesByJsonSchema = (
  schemas: JsonSchemaLike | JsonSchemaLike[] | null | undefined,
  { maxDepth = 4 }: GetVariablesOptions = {}
): string[] => {
  const list: Array<JsonSchemaLike | null | undefined> = Array.isArray(schemas)
    ? schemas
    : schemas == null
    ? []
    : [schemas];

  const out = new Set<string>();
  for (const s of list) extractFromOne(s, '', out, maxDepth);
  return Array.from(out).sort();
};
