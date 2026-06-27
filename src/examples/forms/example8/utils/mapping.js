// ---------------------------------------------------------------------------
// Construcción del payload x-responseMapping a partir de un target del editor.
// ---------------------------------------------------------------------------

import { parsedSchema } from './schema';

/**
 * Construye el JSON que va al runtime:
 *   { targetSchema: <parsed>, 'x-responseMapping': { 'Campo.default': '...', ... } }
 *
 * Para `select` con arrays simples (`$item`) genera un pointer string;
 * para arrays de objetos genera `{ path, itemValue }`.
 */
export const buildMappingJSON = (t) => {
  const rm = {};
  for (const [field, asgn] of Object.entries(t.assignments || {})) {
    if (asgn.type === 'default') {
      rm[`${field}.default`] = asgn.sourceTpl;
    } else if (asgn.type === 'select') {
      const path = asgn.enumSource;
      if (asgn.valueTpl === '$item') {
        rm[`${field}.enum`] = path;
      } else {
        rm[`${field}.enum`] = { path, itemValue: asgn.valueTpl };
        rm[`${field}.enumNames`] = { path, itemValue: asgn.labelTpl };
      }
    }
  }
  return { targetSchema: parsedSchema(t.schema), 'x-responseMapping': rm };
};