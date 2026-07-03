/**
 * Transient-5xx retry wrapper around the global `fetch`.
 *
 * All of our large data (the `fields.pmtiles` vector tiles and the JRC GloFAS
 * flood-depth COGs) is streamed with HTTP range requests from Source
 * Cooperative (`data.source.coop`). That origin is a Cloudflare edge in front
 * of S3, and under a burst of cache-cold range requests — exactly what a zoom
 * fires — it intermittently returns `500`/`502`/`503` for individual requests.
 * A 5xx carries no `Access-Control-Allow-Origin` header, so the browser reports
 * it as a CORS failure, and MapLibre/deck.gl drop the tile.
 *
 * The requests are plain idempotent range GETs, so retrying a failed one almost
 * always succeeds on the next attempt (a different edge sub-request / a now-warm
 * cache). This wrapper retries just those — scoped to the data host, GET only,
 * on 5xx + `429` + network errors — with a short jittered backoff, and bails
 * immediately when the caller aborts (deck.gl aborts tile fetches on pan/zoom).
 *
 * Both `pmtiles` (`Protocol`) and `@developmentseed/geotiff` use the global
 * `fetch` for their range reads, so wrapping it once covers both. Install from
 * the app entry point before any map code runs.
 */

/** Hosts whose GETs get retried. Add CDNs here if they prove flaky too. */
const RETRY_HOSTS = new Set(['data.source.coop']);

/** Status codes worth retrying (transient server / rate-limit). */
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

/** Backoff delays (ms) between attempts; length = number of retries. */
const BACKOFF_MS = [150, 400, 900];

/** Sleep that rejects promptly if the request is aborted mid-backoff. */
function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const jittered = ms + Math.floor(Math.random() * ms * 0.5);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, jittered);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * Install the retry wrapper over `window.fetch`. Idempotent — a second call is
 * a no-op, so it's safe across hot-reloads / double mounts.
 */
export function installRetryFetch(): void {
  const w = window as typeof window & { __retryFetchInstalled?: boolean };
  if (w.__retryFetchInstalled) return;
  w.__retryFetchInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Derive URL, method, and signal without consuming a Request body.
    const isRequest = typeof Request !== 'undefined' && input instanceof Request;
    const url = isRequest ? input.url : String(input);
    const method = (
      init?.method ?? (isRequest ? input.method : 'GET')
    ).toUpperCase();
    const signal = init?.signal ?? (isRequest ? input.signal : undefined);

    // Only retry idempotent GETs to the known-flaky data host; everything else
    // passes straight through to the native fetch.
    let host = '';
    try {
      host = new URL(url, window.location.href).host;
    } catch {
      /* non-parseable URL — treat as non-retryable */
    }
    if (method !== 'GET' || !RETRY_HOSTS.has(host)) {
      return nativeFetch(input, init);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const res = await nativeFetch(input, init);
        if (!RETRY_STATUS.has(res.status) || attempt === BACKOFF_MS.length) {
          return res; // success, non-retryable status, or out of attempts
        }
        // Drop the transient error body before retrying.
        void res.body?.cancel().catch(() => {});
      } catch (err) {
        if (isAbort(err) || attempt === BACKOFF_MS.length) throw err;
        lastError = err;
      }
      await sleep(BACKOFF_MS[attempt], signal);
    }
    // Unreachable in practice (loop returns/throws), but satisfies the type.
    throw lastError ?? new Error(`fetch failed: ${url}`);
  };
}
