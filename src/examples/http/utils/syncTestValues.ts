// ---------------------------------------------------------------------------
// Declared-variables helpers.
//
// testValues is the union of the runtime inputs declared in:
//   formSchema, externalVariables
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

type RequestSchemaKey = 'queryVariables' | 'headers' | 'body' | 'externalVariables';
type DeclaredVariableSource = RequestSchemaKey | 'form';

const SCHEMA_KEYS: RequestSchemaKey[] = [
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
  source: DeclaredVariableSource;
  hasDefault: boolean;
  default: unknown;
}

const collectSchemaVariables = (
  schema: unknown,
  source: DeclaredVariableSource,
  seen: Set<string>,
  variables: DeclaredVariable[]
) => {
  if (!isObjectSchema(schema)) return;
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
      source,
      hasDefault,
      default: hasDefault ? propSchema?.default : undefined,
    });
  }
};

export const getDeclaredVariables = (
  config: Partial<HttpConfig> = {},
  formSchema?: JsonSchema | null
): DeclaredVariable[] => {
  const seen = new Set<string>();
  const variables: DeclaredVariable[] = [];
  collectSchemaVariables(formSchema, 'form', seen, variables);
  for (const schemaKey of SCHEMA_KEYS) {
    collectSchemaVariables(config[schemaKey], schemaKey, seen, variables);
  }
  return variables;
};

export const syncTestValues = (
  config: Partial<HttpConfig> = {},
  currentTestValues: TestValues = {},
  formSchema?: JsonSchema | null
): TestValues => {
  const variables = getDeclaredVariables(config, formSchema);
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
