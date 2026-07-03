// ---------------------------------------------------------------------------
// Wrapper delgado sobre fetch() con timeout y error tipado.
// Se usa desde services/mockService.js cuando el modo es "real" o
// "try-real-then-mock".
// ---------------------------------------------------------------------------

/**
 * Error lanzado por httpRequest cuando la respuesta no es OK
 * o la petición es abortada por timeout.
 */
export class HttpError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, { status, url }: { status?: number; url?: string } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Realiza una petición HTTP y devuelve el body parseado como JSON.
 *
 * @param {string} url
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {object} [options.headers]
 * @param {object|string} [options.body]
 * @param {number} [options.timeoutMs=8000]
 * @returns {Promise<any>}
 */
type HttpRequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | Record<string, any>;
  timeoutMs?: number;
};

export async function httpRequest(
  url: string,
  { method = 'GET', headers, body, timeoutMs = DEFAULT_TIMEOUT_MS }: HttpRequestOptions = {}
) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new HttpError(`HTTP ${res.status} — ${url}`, { status: res.status, url });
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
