import type { HyperSchemaLink, JsonHyperSchema } from '../index.js';

export const getDependentWatchFields = (hyperSchema: JsonHyperSchema): string[] => {
  const fields = new Set<string>();
  for (const link of hyperSchema.links || []) {
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
