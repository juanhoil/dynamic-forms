import type { HyperSchemaLink } from '../index.js';

/**
 * Campos del form que disparan links `dependent`, derivados de los
 * `templatePointers` de los links de lectura (dataSource). El front solo llama
 * al endpoint dependent cuando cambia alguno de estos campos.
 */
export const getDependentWatchFields = (dataSource: HyperSchemaLink[] = []): string[] => {
  const fields = new Set<string>();
  for (const link of dataSource) {
    if (link.dataRole !== 'dependent') continue;
    getTemplatePointerFields(link).forEach((field) => fields.add(field));
  }
  return Array.from(fields).sort();
};

const getTemplatePointerFields = (link: HyperSchemaLink): string[] => {
  const pointers = link.request?.templatePointers;
  if (!pointers || typeof pointers !== 'object') return [];
  return Object.keys(pointers.properties || {});
};
