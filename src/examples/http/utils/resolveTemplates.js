// ---------------------------------------------------------------------------
// resolveTemplates — synchronous walker for `{{ path }}` tokens.
//
// Used by the httpConfig editor (exampleHR1) to:
//   1. resolve URL / body / queryVariables before sending the request
//   2. show a live "Resolved request preview" while the user edits
//
// Tokens follow the convention used in the httpConfig shape:
//   {{form.someField}}              -> reads from scope.form
//   {{externalVariables.foo}}       -> reads from scope.externalVariables
//   {{testValues.bar}}              -> reads from scope.testValues
//   {{someFlatKey}}                 -> reads any top-level scope key
//
// Scope is flattened so top-level keys win over namespaced ones, which
// matches the intuition "if I wrote {{id}} it's the literal id".
// ---------------------------------------------------------------------------

const TOKEN_RE = /{{\s*([^}]+?)\s*}}/g;

export const getByPath = (obj, path) => {
  if (obj == null) return undefined;
  const parts = path.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const buildFlatScope = (scope) => {
  const { form, externalVariables, testValues, ...rest } = scope || {};
  return {
    ...(isPlainObject(testValues) ? testValues : {}),
    ...(isPlainObject(externalVariables) ? externalVariables : {}),
    ...(isPlainObject(rest) ? rest : {}),
    form: isPlainObject(form) ? form : {},
  };
};

const replaceInString = (str, scope) =>
  str.replace(TOKEN_RE, (_, path) => {
    const v = getByPath(scope, path);
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });

const walk = (node, scope) => {
  if (node == null) return node;
  if (typeof node === 'string') return replaceInString(node, scope);
  if (typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((item) => walk(item, scope));
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    out[k] = walk(v, scope);
  }
  return out;
};

/**
 * Resolve all `{{ path }}` tokens in the given input against `scope`.
 * Returns a NEW value (no mutation). Strings, objects and arrays are
 * walked recursively; primitives (number/boolean/null) pass through.
 */
export const resolveTemplates = (input, scope = {}) => {
  const flat = buildFlatScope(scope);
  return walk(input, flat);
};

/**
 * Collect every distinct token path that appears in the input.
 * Useful for "Add to external variables" suggestions.
 */
export const collectTokenPaths = (input) => {
  const out = new Set();
  const visit = (node) => {
    if (node == null) return;
    if (typeof node === 'string') {
      let m;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(node)) !== null) out.add(m[1].trim());
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object') {
      Object.values(node).forEach(visit);
    }
  };
  visit(input);
  return Array.from(out);
};

/**
 * Given a string input and a flat scope, return the list of token paths
 * that are NOT resolvable in the scope. Used to mark the URL red.
 */
export const unresolvedTokens = (input, scope = {}) => {
  const flat = buildFlatScope(scope);
  const missing = new Set();
  const visit = (node) => {
    if (node == null) return;
    if (typeof node === 'string') {
      let m;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(node)) !== null) {
        const p = m[1].trim();
        if (getByPath(flat, p) === undefined) missing.add(p);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object') {
      Object.values(node).forEach(visit);
    }
  };
  visit(input);
  return Array.from(missing);
};