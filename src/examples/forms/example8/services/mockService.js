// ---------------------------------------------------------------------------
// Servicio que resuelve un link del schema jsonHyperSchema a una respuesta.
// Soporta tres modos:
//   - 'try-real-then-mock' (default): intenta la red, si falla cae al mock.
//   - 'mock-only': siempre usa el mock (ideal para CI / entornos sin red).
//   - 'real-only': solo red, propaga errores.
//
// Resolución del mock:
//   1. Si el link trae `valueTest` → lo devuelve clonado.
//   2. Si no, genera un default según `link.targetSchema.type`.
// ---------------------------------------------------------------------------

import { HttpError } from './httpClient';

const clone = (v) =>
  typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

/**
 * Heurística de respuesta por defecto cuando no hay `valueTest`.
 * Devuelve `[]`, `{}` o `null` según el tipo del targetSchema.
 */
export function defaultForLink(link) {
  const s = link?.targetSchema;
  if (!s) return null;
  if (s.type === 'array') return [];
  if (s.type === 'object') return {};
  return null;
}

/**
 * Crea un servicio mockeado a partir de un fetcher real inyectable.
 *
 * @param {object} options
 * @param {(link)=>Promise<any>} [options.realFetcher]
 *   Función que recibe un link y devuelve la respuesta parseada.
 *   Si no se provee, no se intentará la red.
 * @param {(link)=>any} [options.defaultFor=defaultForLink]
 *   Generador de respuesta por defecto para el modo mock.
 * @param {'try-real-then-mock'|'mock-only'|'real-only'} [options.mode='try-real-then-mock']
 * @returns {{ mode, resolve: (link)=>Promise<{source:'real'|'mock',data:any}> }}
 */
export function createMockService({
  realFetcher,
  defaultFor = defaultForLink,
  mode = 'try-real-then-mock',
} = {}) {
  return {
    mode,
    async resolve(link) {
      const valueTest = link?.valueTest;
      if (valueTest !== undefined) {
        return { source: 'mock', data: clone(valueTest) };
      }
      const url = link?.href;
      if (mode === 'mock-only' || !url || !realFetcher) {
        return { source: 'mock', data: defaultFor(link) };
      }
      if (mode === 'real-only') {
        const data = await realFetcher(link);
        return { source: 'real', data };
      }
      // 'try-real-then-mock'
      try {
        const data = await realFetcher(link);
        return { source: 'real', data };
      } catch (err) {
        if (err instanceof HttpError || err?.name === 'AbortError') {
          // Silencioso: el caller usa el mock automáticamente.
          return { source: 'mock', data: defaultFor(link) };
        }
        throw err;
      }
    },
  };
}