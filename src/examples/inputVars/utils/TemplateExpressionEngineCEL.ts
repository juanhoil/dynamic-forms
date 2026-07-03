// ---------------------------------------------------------------------------
// Motor de plantillas {{ expresión }} usando CEL (@marcbachmann/cel-js).
//
// Es el ÚNICO motor del módulo http: se usa tanto en runtime
// (useJsonHyperSchema, contra las respuestas HTTP) como en el editor para
// construir/validar las requests (buildRequest, preview, tokens sin resolver).
// Así una misma expresión se evalúa igual en editor, preview y runtime.
// ---------------------------------------------------------------------------

import { evaluate } from '@marcbachmann/cel-js';

export type Scope = Record<string, unknown> | unknown[];

const TOKEN_RE = /{{\s*([^}]+?)\s*}}/g;

type AsyncReplacer = (match: string, ...groups: string[]) => Promise<string>;

const normalizeScope = (scope: Scope): Record<string, unknown> => {
  if (Array.isArray(scope)) return { root: scope };
  return scope;
};

// ---------------------------------------------------------------------------
// Reemplazo asíncrono sobre String.prototype.replace
// (replace nativo no soporta callbacks async)
// ---------------------------------------------------------------------------

const replaceAsync = async (
  str: string,
  regex: RegExp,
  asyncFn: AsyncReplacer
): Promise<string> => {
  const tasks: Array<Promise<string>> = [];
  str.replace(regex, (match: string, ...args: unknown[]) => {
    tasks.push(asyncFn(match, ...(args as string[])));
    return match;
  });
  const results = await Promise.all(tasks);
  let i = 0;
  return str.replace(regex, () => results[i++]);
};

// ---------------------------------------------------------------------------
// Render de plantillas {{ expresión }} usando CEL (@marcbachmann/cel-js)
// ---------------------------------------------------------------------------

export const renderTemplate = async (
  texto: string,
  jsonData: Scope
): Promise<string> => {
  const scope = normalizeScope(jsonData);

  return replaceAsync(texto, TOKEN_RE, async (_match, expression) => {
    let value: unknown;

    try {
      value = await evaluate(expression.trim(), scope);
    } catch (error) {
      console.error('Error al evaluar expresión:', expression, error);
      return ''; // evita inyectar "undefined"/"false" en el texto
    }

    if (value === null || value === undefined) return '';

    // CEL devuelve BigInt para enteros
    if (typeof value === 'bigint') return value.toString();

    return String(value);
  });
};

// ---------------------------------------------------------------------------
// Render recursivo: aplica renderTemplate a cualquier string dentro de la
// estructura (strings, arrays y objetos anidados)
// ---------------------------------------------------------------------------

export const renderTemplateRecursive = async (
  value: unknown,
  sessionData: Scope
): Promise<unknown> => {
  if (typeof value === 'string') {
    return renderTemplate(value, sessionData);
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => renderTemplateRecursive(item, sessionData))
    );
  }

  if (value && typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = await renderTemplateRecursive(val, sessionData);
    }
    return resolved;
  }

  return value;
};

// ---------------------------------------------------------------------------
// Helpers de análisis estático/semántico de tokens (engine = CEL).
// Permiten que el editor (extracción de variables, validación de tokens sin
// resolver) use el mismo motor que el runtime.
// ---------------------------------------------------------------------------

// Recorre strings/arrays/objetos recogiendo cada string encontrado.
const visitStrings = (node: unknown, onString: (s: string) => void): void => {
  if (node == null) return;
  if (typeof node === 'string') {
    onString(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => visitStrings(item, onString));
    return;
  }
  if (typeof node === 'object') {
    Object.values(node as Record<string, unknown>).forEach((v) =>
      visitStrings(v, onString)
    );
  }
};

/**
 * Devuelve la lista de expresiones distintas que aparecen como `{{ expr }}`
 * dentro del input (string, array u objeto). Síncrono: sólo extrae texto.
 */
const collectTokenPaths = (input: unknown): string[] => {
  const out = new Set<string>();
  visitStrings(input, (str) => {
    let m: RegExpExecArray | null;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(str)) !== null) out.add(m[1].trim());
  });
  return Array.from(out);
};

/**
 * Devuelve las expresiones `{{ expr }}` que NO se resuelven contra `scope`
 * evaluándolas con CEL (mismo motor que renderTemplate). Una expresión se
 * considera no resuelta si la evaluación lanza o devuelve null/undefined.
 * Async porque CEL evalúa de forma asíncrona.
 */
export const unresolvedTokens = async (
  input: unknown,
  scope: Scope = {}
): Promise<string[]> => {
  const expressions = collectTokenPaths(input);
  const normalizedScope = normalizeScope(scope);
  const missing: string[] = [];
  for (const expr of expressions) {
    try {
      const value = await evaluate(expr, normalizedScope);
      if (value === null || value === undefined) missing.push(expr);
    } catch {
      missing.push(expr);
    }
  }
  return missing;
};
