// ---------------------------------------------------------------------------
// Construcción del payload x-responseMapping a partir de un target del editor.
// ---------------------------------------------------------------------------

import { findAllArraySources, parsedSchema } from './schema';
import type { ResponseMappingSource } from '@/examples/forms/types';

export type ResponseMapping = Record<string, ResponseMappingSource>;

export type ResponseMappingAssignment =
  | {
      type: 'default';
      sourceTpl: string;
    }
  | {
      type: 'select';
      enumSource: string;
      valueTpl?: string;
      labelTpl?: string;
    };

export type ResponseMappingAssignments = Record<string, ResponseMappingAssignment>;

type MappingTarget = {
  schema?: unknown;
  assignments?: ResponseMappingAssignments;
};

const parseMapping = (mapping: ResponseMapping | string | undefined): ResponseMapping => {
  if (!mapping) return {};
  if (typeof mapping !== 'string') return mapping;
  try {
    return JSON.parse(mapping) as ResponseMapping;
  } catch {
    return {};
  }
};

export const assignmentsFromMapping = (
  mapping: ResponseMapping | string | undefined = {}
): ResponseMappingAssignments => {
  const assignments: ResponseMappingAssignments = {};
  Object.entries(parseMapping(mapping)).forEach(([key, source]) => {
    const [field, kind] = key.split('.');
    if (!field) return;
    if (kind === 'default') {
      assignments[field] = { type: 'default', sourceTpl: String(source) };
    } else if (kind === 'enum') {
      const objectSource = (source && typeof source === 'object'
        ? source
        : { source: String(source || 'root') }) as Extract<ResponseMappingSource, object>;
      const item = (objectSource.item || {}) as { value?: string; label?: string };
      assignments[field] = {
        type: 'select',
        enumSource: String(objectSource.source || 'root'),
        valueTpl: typeof item.value === 'string' ? item.value : '',
        labelTpl: typeof item.label === 'string' ? item.label : '',
      };
    }
  });
  return assignments;
};

/**
 * Construye el JSON que va al runtime:
 *   { targetSchema: <parsed>, 'x-responseMapping': { 'Campo.default': '...', ... } }
 *
 * `.enum` es siempre un objeto que separa dos conceptos:
 *   - `source`: la fuente de la colección (path `settlements`/`root` o CEL).
 *   - `item`:   proyección por elemento (`value`/`label`) para arrays de objetos.
 * Los arrays de valores simples solo llevan `source`.
 */
export const buildMappingJSON = (t: MappingTarget) => {
  const rm: Record<string, any> = {};
  for (const [field, asgn] of Object.entries(t.assignments || {})) {
    if (asgn.type === 'default') {
      rm[`${field}.default`] = asgn.sourceTpl;
    } else if (asgn.type === 'select') {
      const src = asgn.enumSource || 'root';
      const arraySource = findAllArraySources(t.schema).find((source) => source.key === src);
      if (arraySource?.isSimple || !asgn.valueTpl || !asgn.labelTpl) {
        rm[`${field}.enum`] = { source: src };
      } else {
        rm[`${field}.enum`] = {
          source: src,
          item: {
            value: asgn.valueTpl,
            label: asgn.labelTpl,
          },
        };
      }
    }
  }
  return { targetSchema: parsedSchema(t.schema), 'x-responseMapping': rm };
};