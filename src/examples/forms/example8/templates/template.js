// ---------------------------------------------------------------------------
// Motor de plantillas {{ expresión }} usando CEL (@marcbachmann/cel-js).
// Se usa en runtime desde useJsonHyperSchema para evaluar los mappings
// contra las respuestas HTTP (o mocks).
//
// NOTA: este es el engine "real" con CEL. El editor usa otro más simple
// (ver ../utils/template.js) para preview sincrónico.
// ---------------------------------------------------------------------------

import { evaluate } from '@marcbachmann/cel-js';
import { encode } from '@toon-format/toon';

// ---------------------------------------------------------------------------
// Reemplazo asíncrono sobre String.prototype.replace
// (replace nativo no soporta callbacks async)
// ---------------------------------------------------------------------------

const replaceAsync = async (str, regex, asyncFn) => {
  const tasks = [];
  str.replace(regex, (match, ...args) => {
    tasks.push(asyncFn(match, ...args));
    return match;
  });
  const results = await Promise.all(tasks);
  let i = 0;
  return str.replace(regex, () => results[i++]);
};

// ---------------------------------------------------------------------------
// Render de plantillas {{ expresión }} usando CEL (@marcbachmann/cel-js)
// ---------------------------------------------------------------------------

export const renderTemplate = async (texto, jsonData, useToon = false) => {
  return replaceAsync(texto, /{{\s*([^}]+?)\s*}}/g, async (_, expression) => {
    let value;

    try {
      value = await evaluate(expression.trim(), jsonData);
    } catch (error) {
      console.error('Error al evaluar expresión:', expression, error);
      return ''; // evita inyectar "undefined"/"false" en el texto
    }

    if (value === null || value === undefined) return '';

    // CEL devuelve BigInt para enteros
    if (typeof value === 'bigint') return value.toString();

    if (typeof value === 'object' && useToon) {
      return encode(value);
    }

    return String(value);
  });
};

// ---------------------------------------------------------------------------
// Render recursivo: aplica renderTemplate a cualquier string dentro de la
// estructura (strings, arrays y objetos anidados)
// ---------------------------------------------------------------------------

export const renderTemplateRecursive = async (value, sessionData) => {
  if (typeof value === 'string') {
    return renderTemplate(value, sessionData);
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => renderTemplateRecursive(item, sessionData))
    );
  }

  if (value && typeof value === 'object') {
    const resolved = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = await renderTemplateRecursive(val, sessionData);
    }
    return resolved;
  }

  return value;
};