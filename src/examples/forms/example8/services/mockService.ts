// ---------------------------------------------------------------------------
// Servicio que resuelve un link del schema jsonHyperSchema a una respuesta.
// Soporta tres modos:
//   - 'try-real-then-mock' (default): intenta la red, si falla cae al mock.
//   - 'mock-only': siempre usa el mock (ideal para CI / entornos sin red).
//   - 'real-only': solo red, propaga errores.
//
// Resolución del mock:
//   1. Si `useTestValues` está activo y el link trae `response.testValues`
//      o `valueTest` → lo devuelve clonado.
//   2. Si no, genera un default según `response.jsonSchema` o `targetSchema`.
// ---------------------------------------------------------------------------

type MockServiceMode = 'try-real-then-mock' | 'mock-only' | 'real-only';
type HyperSchemaLink = Record<string, any>;

type MockServiceOptions = {
  realFetcher?: (link: HyperSchemaLink) => Promise<any>;
  defaultFor?: (link: HyperSchemaLink) => any;
  mode?: MockServiceMode;
  useTestValues?: boolean;
};

const clone = (v: any) =>
  typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

/**
 * Heurística de respuesta por defecto cuando no hay `valueTest`.
 * Devuelve `[]`, `{}` o `null` según el tipo del targetSchema.
 */
export function defaultForLink(link: HyperSchemaLink) {
  const s = link?.response?.jsonSchema || link?.targetSchema;
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
 * @param {boolean} [options.useTestValues=true]
 *   Permite ignorar testValues cuando el hook se usa como runtime real.
 * @returns {{ mode, resolve: (link)=>Promise<{source:'real'|'mock',data:any}> }}
 */
export function createMockService({
  realFetcher,
  defaultFor = defaultForLink,
  mode = 'try-real-then-mock',
  useTestValues = true,
}: MockServiceOptions = {}) {
  return {
    mode,
    async resolve(link) {
      const valueTest = link?.response?.testValues ?? link?.valueTest;
      if (useTestValues && valueTest !== undefined) {
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
        // Silencioso: el caller usa el mock automáticamente cuando la red,
        // CORS o el endpoint fallan.
        return { source: 'mock', data: defaultFor(link) };
      }
    },
  };
}