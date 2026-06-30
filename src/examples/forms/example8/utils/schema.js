// ---------------------------------------------------------------------------
// Utilidades de JSON Schema (puras, sin estado)
// ---------------------------------------------------------------------------

/**
 * Parsea un JSON Schema de forma segura.
 * Acepta string u objeto; devuelve `{}` ante error.
 */
export const parsedSchema = (raw) => {
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
};

/**
 * Devuelve propiedades planas (no-array) de un schema tipo object.
 * Útil para autocompletar nombres de variables disponibles en mappings.
 */
export const schemaPlainProps = (schema) => {
  const s = parsedSchema(typeof schema === 'string' ? schema : JSON.stringify(schema));
  if (s.type === 'object' && s.properties) {
    return Object.entries(s.properties)
      .filter(([, v]) => v.type !== 'array')
      .map(([k]) => k);
  }
  return [];
};

/**
 * Detecta todas las fuentes de array en un schema:
 *   - $root si la raíz es array
 *   - o cada propiedad object de tipo array
 *
 * Devuelve: [{ key, itemProps, itemSchema, isSimple }]
 *   - key: nombre del array source
 *   - itemProps: nombres de propiedades si es array de objects, o ['$item'] si simple
 *   - isSimple: true cuando el array contiene valores escalares (no objects)
 */
export const findAllArraySources = (schema) => {
  const s = parsedSchema(typeof schema === 'string' ? schema : JSON.stringify(schema));
  const out = [];
  if (s.type === 'array') {
    if (s.items && s.items.properties) {
      out.push({
        key: '$root',
        itemProps: Object.keys(s.items.properties),
        itemSchema: s.items,
        isSimple: false,
      });
    } else if (s.items) {
      out.push({ key: '$root', itemProps: ['$item'], isSimple: true });
    }
  }
  if (s.type === 'object' && s.properties) {
    for (const [k, v] of Object.entries(s.properties)) {
      if (v.type === 'array') {
        if (v.items && v.items.properties) {
          out.push({
            key: k,
            itemProps: Object.keys(v.items.properties),
            itemSchema: v.items,
            isSimple: false,
          });
        } else if (v.items) {
          out.push({ key: k, itemProps: ['$item'], isSimple: true });
        }
      }
    }
  }
  return out;
};