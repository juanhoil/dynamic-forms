// ---------------------------------------------------------------------------
// Adapter: convierte el schema jsonHyperSchema (links[]) al formato
// plano de "target" que consume el editor.
// ---------------------------------------------------------------------------

/**
 * Lee el `links[]` del schema y devuelve el array de targets para el editor.
 * Conserva `rel`, `x-data-role`, `templatePointers` y `valueTest`.
 */
export const targetsFromSchema = (schema) => {
  const links = schema?.links || [];
  return links.map((link, idx) => {
    const mapping = link['x-responseMapping'] || link['x-response-mapping'] || {};
    const assignments = {};
    Object.entries(mapping).forEach(([key, source]) => {
      const [field, kind] = key.split('.');
      if (!field) return;
      if (kind === 'default') {
        assignments[field] = { type: 'default', sourceTpl: String(source) };
      } else if (kind === 'enum') {
        if (source && typeof source === 'object') {
          assignments[field] = {
            type: 'select',
            enumSource: source.path || '$root',
            valueTpl: source.itemValue || '',
            labelTpl:
              link['x-responseMapping']?.[`${field}.enumNames`]?.itemValue || '',
          };
        } else {
          assignments[field] = {
            type: 'select',
            enumSource: String(source),
            valueTpl: '$item',
            labelTpl: '$item',
          };
        }
      }
    });
    return {
      id: `t${idx + 1}`,
      method: (link.method || 'GET').toUpperCase(),
      name: link.href || `${link.method || 'GET'} /`,
      rel: link.rel || '',
      dataRole: link['x-data-role'] || link['x-dataRole'] || '',
      templatePointers: link.templatePointers || {},
      schema: JSON.stringify(link.targetSchema || {}, null, 2),
      testJSON: link.valueTest ? JSON.stringify(link.valueTest, null, 2) : '',
      assignments,
    };
  });
};