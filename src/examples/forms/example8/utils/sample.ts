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
} as const;

/**
 * Genera un objeto/array de muestra a partir de un JSON Schema.
 * Sirve como `testJSON` por defecto cuando se carga un target sin datos.
 */
export const sampleFromSchema = (schema: unknown): any => {
  const s = parsedSchema(schema);
  if (s.type === 'array') {
    const item = s.items ? sampleFromSchema(s.items) : {};
    return [item, item, item];
  }
  if (s.type === 'object' && s.properties) {
    const out: Record<string, any> = {};
    Object.entries(s.properties).forEach(([k, v]) => {
      const prop = v as Record<string, any>;
      if (prop.type === 'array') {
        const item = prop.items ? sampleFromSchema(prop.items) : 'valor';
        out[k] = Array.isArray(item) ? item : [item, item, item];
      } else if (prop.type === 'object' && prop.properties) {
        out[k] = sampleFromSchema(prop);
      } else {
        out[k] = SAMPLE_VALUES[prop.type as keyof typeof SAMPLE_VALUES] ?? null;
      }
    });
    return out;
  }
  return SAMPLE_VALUES[s.type as keyof typeof SAMPLE_VALUES] ?? null;
};