// ---------------------------------------------------------------------------
// Generación de test JSON sintético a partir de un JSON Schema.
// Se usa como `testJSON` por defecto cuando un target no lo trae.
// ---------------------------------------------------------------------------

import { parsedSchema } from './schema';

const SAMPLE_VALUES = {
  string: 'ejemplo',
  number: 1,
  integer: 1,
  boolean: true,
};

/**
 * Genera un objeto/array de muestra a partir de un JSON Schema.
 * Sirve como `testJSON` por defecto cuando se carga un target sin datos.
 */
export const sampleFromSchema = (schema) => {
  const s = parsedSchema(schema);
  if (s.type === 'array') {
    const item = s.items ? sampleFromSchema(s.items) : {};
    return [item, item, item];
  }
  if (s.type === 'object' && s.properties) {
    const out = {};
    Object.entries(s.properties).forEach(([k, v]) => {
      if (v.type === 'array') {
        const item = v.items ? sampleFromSchema(v.items) : 'valor';
        out[k] = Array.isArray(item) ? item : [item, item, item];
      } else if (v.type === 'object' && v.properties) {
        out[k] = sampleFromSchema(v);
      } else {
        out[k] = SAMPLE_VALUES[v.type] ?? null;
      }
    });
    return out;
  }
  return SAMPLE_VALUES[s.type] ?? null;
};