// ---------------------------------------------------------------------------
// Construcción del payload x-responseMapping a partir de un target del editor.
// ---------------------------------------------------------------------------

import { parsedSchema } from './schema';

/**
 * Construye el JSON que va al runtime:
 *   { targetSchema: <parsed>, 'x-responseMapping': { 'Campo.default': '...', ... } }
 *
 * Para `select` genera un solo mapping `.enum`. Si el array es de objetos,
 * incluye `itemValue` e `itemLabel` para resolver value/label juntos.
 */
export const buildMappingJSON = (t) => {
  const rm = {};
  for (const [field, asgn] of Object.entries(t.assignments || {})) {
    if (asgn.type === 'default') {
      rm[`${field}.default`] = asgn.sourceTpl;
    } else if (asgn.type === 'select') {
      const path = asgn.enumSource;
      const isRoot = !path || path === '$root';
      if (asgn.valueTpl === '$item') {
        rm[`${field}.enum`] = isRoot ? '' : path;
      } else {
        rm[`${field}.enum`] = {
          ...(isRoot ? {} : { path }),
          itemValue: asgn.valueTpl,
          itemLabel: asgn.labelTpl,
        };
      }
    }
  }
  return { targetSchema: parsedSchema(t.schema), 'x-responseMapping': rm };
};