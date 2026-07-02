// ---------------------------------------------------------------------------
// Render simple de plantillas {{var}} usado SOLO por el editor y el tester.
// NO usa CEL (eso está en templates/template.js). Es síncrono y devuelve
// strings directamente. Diseñado para preview y validación de mappings.
// ---------------------------------------------------------------------------

/**
 * Renderiza una plantilla con interpolación `{{a}}` / `{{a.b}}`.
 * Si la plantilla es `$item`, devuelve el `data` literal.
 */
export const renderTpl = (tpl: unknown, data: Record<string, any>) => {
  if (tpl === '$item') return data;
  if (typeof tpl !== 'string') return '';
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const value = k.split('.').reduce((current, key) => {
      if (current === null || typeof current !== 'object') return undefined;
      return current[key];
    }, data);
    return value ?? '';
  }).trim();
};

/**
 * Devuelve las variables usadas en una plantilla.
 */
export const tplVars = (tpl: string) => {
  if (!tpl || tpl === '$item') return [];
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  return Array.from(tpl.matchAll(re)).map((match) => match[1]);
};