import { vi } from 'vitest';

/** A JSON response like json-server sends. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A fetch that never answers until its signal aborts (a hanging server). */
export function hangingFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
    // Like the real fetch: a signal that is already aborted fails at once.
    if (init?.signal?.aborted) abort();
    init?.signal?.addEventListener('abort', abort);
  });
}

/** What fetch throws when nothing listens on the port. */
export function networkError(): Promise<Response> {
  return Promise.reject(new TypeError('Failed to fetch'));
}

/** Replaces the real fetch for one test. Tests never reach a real server. */
export function mockFetch() {
  return vi.spyOn(globalThis, 'fetch');
}

/** A promise the test resolves by hand, to hold a request "in flight". */
export function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** The method, path and parsed body of the n-th fetch call. */
export function callInfo(spy: ReturnType<typeof mockFetch>, index: number) {
  const call = spy.mock.calls[index];
  if (call === undefined) throw new Error(`fetch was not called ${index + 1} times`);
  const [input, init] = call;
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
  );
  const rawBody = init?.body;
  const body: unknown = typeof rawBody === 'string' ? JSON.parse(rawBody) : undefined;
  return { method: init?.method ?? 'GET', path: url.pathname, body };
}
