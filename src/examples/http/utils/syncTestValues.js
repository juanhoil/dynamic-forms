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

const SCHEMA_KEYS = ['queryVariables', 'headers', 'body', 'externalVariables'];

const isObjectSchema = (schema) =>
  schema && typeof schema === 'object' && schema.type === 'object' && schema.properties;

const normalizeType = (propSchema) => {
  const type = Array.isArray(propSchema?.type) ? propSchema.type[0] : propSchema?.type;
  return type || 'string';
};

const emptyForType = (type) => {
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

export const getDeclaredVariables = (config = {}) => {
  const seen = new Set();
  const variables = [];
  for (const schemaKey of SCHEMA_KEYS) {
    const schema = config[schemaKey];
    if (!isObjectSchema(schema)) continue;
    for (const [name, propSchema] of Object.entries(schema.properties)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const hasDefault =
        propSchema && typeof propSchema === 'object' && 'default' in propSchema;
      variables.push({
        name,
        type: normalizeType(propSchema),
        source: schemaKey,
        hasDefault,
        default: hasDefault ? propSchema.default : undefined
      });
    }
  }
  return variables;
};

export const syncTestValues = (config = {}, currentTestValues = {}) => {
  const variables = getDeclaredVariables(config);
  const next = {};
  for (const v of variables) {
    next[v.name] = v.name in (currentTestValues || {})
      ? currentTestValues[v.name]
      : (v.hasDefault ? v.default : emptyForType(v.type));
  }
  return next;
};
