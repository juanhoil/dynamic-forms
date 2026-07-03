// ---------------------------------------------------------------------------
// Utilidades de JSON Schema (puras, sin estado)
// ---------------------------------------------------------------------------

/**
 * Parsea un JSON Schema de forma segura.
 * Acepta string u objeto; devuelve `{}` ante error.
 */
type JsonSchemaLike = Record<string, any>;

export const parsedSchema = (raw: unknown): JsonSchemaLike => {
  try {
    if (typeof raw === 'string') return JSON.parse(raw || '{}');
    return (raw || {}) as JsonSchemaLike;
  } catch (e) {
    return {};
  }
};

/**
 * Devuelve propiedades planas (no-array) de un schema tipo object.
 * Útil para autocompletar nombres de variables disponibles en mappings.
 */
export const schemaPlainProps = (schema: unknown) => {
  const s = parsedSchema(typeof schema === 'string' ? schema : JSON.stringify(schema));
  if (s.type === 'object' && s.properties) {
    return Object.entries(s.properties)
      .filter(([, v]) => (v as JsonSchemaLike).type !== 'array')
      .map(([k]) => k);
  }
  return [];
};

/**
 * Detecta todas las fuentes de array en un schema:
 *   - root si la raíz es array
 *   - o cada propiedad object de tipo array
 *
 * Devuelve: [{ key, itemProps, itemSchema, isSimple }]
 *   - key: nombre del array source
 *   - itemProps: nombres de propiedades si es array de objects, o el path del array si es simple
 *   - isSimple: true cuando el array contiene valores escalares (no objects)
 */
export const findAllArraySources = (schema: unknown) => {
  const s = parsedSchema(typeof schema === 'string' ? schema : JSON.stringify(schema));
  const out: Array<Record<string, any>> = [];
  if (s.type === 'array') {
    if (s.items && s.items.properties) {
      out.push({
        key: 'root',
        itemProps: Object.keys(s.items.properties),
        itemSchema: s.items,
        isSimple: false,
      });
    } else if (s.items) {
      out.push({ key: 'root', itemProps: ['root'], isSimple: true });
    }
  }
  if (s.type === 'object' && s.properties) {
    for (const [k, v] of Object.entries(s.properties)) {
      const prop = v as JsonSchemaLike;
      if (prop.type === 'array') {
        if (prop.items && prop.items.properties) {
          out.push({
            key: k,
            itemProps: Object.keys(prop.items.properties),
            itemSchema: prop.items,
            isSimple: false,
          });
        } else if (prop.items) {
          out.push({ key: k, itemProps: [k], isSimple: true });
        }
      }
    }
  }
  return out;
};