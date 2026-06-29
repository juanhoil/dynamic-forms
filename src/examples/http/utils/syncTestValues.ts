// ---------------------------------------------------------------------------
// Declared-variables helpers.
//
// testValues is the union of the top-level properties declared in:
//   queryVariables, headers, body, externalVariables
//
// `getDeclaredVariables` returns that union as an ordered list with each
// variable's type and default (first declaration wins on name collisions).
//
// `syncTestValues` builds the testValues object so it holds exactly those
// variables:
//   - if testValues already has a value → it is preserved (user edits win),
//   - else if the property declares a `default` → that default is used,
//   - else a type-based empty value is used so the key is visible/editable.
// Variables no longer declared in any schema are dropped.
// ---------------------------------------------------------------------------

import type { HttpConfig, JsonSchema, TestValues } from './types';

const SCHEMA_KEYS: Array<keyof HttpConfig> = [
  'queryVariables',
  'headers',
  'body',
  'externalVariables',
];

const isObjectSchema = (schema: unknown): schema is JsonSchema =>
  Boolean(
    schema &&
      typeof schema === 'object' &&
      (schema as JsonSchema).type === 'object' &&
      (schema as JsonSchema).properties
  );

const normalizeType = (propSchema: JsonSchema | undefined): string => {
  const type = Array.isArray(propSchema?.type)
    ? propSchema?.type[0]
    : propSchema?.type;
  return type || 'string';
};

const emptyForType = (type: string): unknown => {
  switch (type) {
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return '';
  }
};

export interface DeclaredVariable {
  name: string;
  type: string;
  source: keyof HttpConfig;
  hasDefault: boolean;
  default: unknown;
}

export const getDeclaredVariables = (
  config: HttpConfig = {}
): DeclaredVariable[] => {
  const seen = new Set<string>();
  const variables: DeclaredVariable[] = [];
  for (const schemaKey of SCHEMA_KEYS) {
    const schema = config[schemaKey];
    if (!isObjectSchema(schema)) continue;
    for (const [name, rawProp] of Object.entries(schema.properties ?? {})) {
      if (seen.has(name)) continue;
      seen.add(name);
      const propSchema =
        rawProp && typeof rawProp === 'object'
          ? (rawProp as JsonSchema)
          : undefined;
      const hasDefault = Boolean(propSchema && 'default' in propSchema);
      variables.push({
        name,
        type: normalizeType(propSchema),
        source: schemaKey,
        hasDefault,
        default: hasDefault ? propSchema?.default : undefined,
      });
    }
  }
  return variables;
};

export const syncTestValues = (
  config: HttpConfig = {},
  currentTestValues: TestValues = {}
): TestValues => {
  const variables = getDeclaredVariables(config);
  const next: TestValues = {};
  for (const v of variables) {
    next[v.name] =
      v.name in (currentTestValues || {})
        ? currentTestValues[v.name]
        : v.hasDefault
        ? v.default
        : emptyForType(v.type);
  }
  return next;
};
