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
      if (source && typeof source === 'object') {
        const objectSource = source as Extract<ResponseMappingSource, object>;
        assignments[field] = {
          type: 'select',
          enumSource: objectSource.path === '$root' ? 'root' : String(objectSource.path || 'root'),
          valueTpl: typeof objectSource.itemValue === 'string' ? objectSource.itemValue : '',
          labelTpl: typeof objectSource.itemLabel === 'string' ? objectSource.itemLabel : '',
        };
      } else {
        const enumSource = String(source || 'root');
        assignments[field] = {
          type: 'select',
          enumSource: enumSource === '$root' ? 'root' : enumSource,
          valueTpl: '',
          labelTpl: '',
        };
      }
    }
  });
  return assignments;
};

/**
 * Construye el JSON que va al runtime:
 *   { targetSchema: <parsed>, 'x-responseMapping': { 'Campo.default': '...', ... } }
 *
 * Para `select` genera un solo mapping `.enum`. Si el array es de objetos,
 * incluye `itemValue` e `itemLabel` para resolver value/label juntos.
 */
export const buildMappingJSON = (t: MappingTarget) => {
  const rm: Record<string, any> = {};
  for (const [field, asgn] of Object.entries(t.assignments || {})) {
    if (asgn.type === 'default') {
      rm[`${field}.default`] = asgn.sourceTpl;
    } else if (asgn.type === 'select') {
      const path = asgn.enumSource;
      const normalizedPath = !path || path === '$root' ? 'root' : path;
      const src = findAllArraySources(t.schema).find((source) => source.key === normalizedPath);
      if (src?.isSimple || !asgn.valueTpl || !asgn.labelTpl) {
        rm[`${field}.enum`] = normalizedPath;
      } else {
        rm[`${field}.enum`] = {
          ...(normalizedPath === 'root' ? {} : { path: normalizedPath }),
          itemValue: asgn.valueTpl,
          itemLabel: asgn.labelTpl,
        };
      }
    }
  }
  return { targetSchema: parsedSchema(t.schema), 'x-responseMapping': rm };
};