import { deferred, jsonResponse, mockFetch, networkError } from './fetchMock';

export type FakeRequest = { method: string; path: string; body: unknown };
type Responder = (request: FakeRequest, init?: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A tiny in-memory json-server behind vi.spyOn(globalThis, 'fetch').
 * It answers like the real one: GET/POST /tasks, PATCH/DELETE /tasks/:id,
 * 404 for a missing id and 500 for a POST with an id that already exists.
 * Tests can make the next request fail, hang, or wait until they release it.
 */
export function startFakeServer(initial: readonly unknown[]) {
  const data: unknown[] = initial.map((item) => (isRecord(item) ? { ...item } : item));
  const requests: FakeRequest[] = [];
  const queued: Responder[] = [];
  let offline = false;

  function indexOf(id: string) {
    return data.findIndex((item) => isRecord(item) && item.id === id);
  }

  function answer({ method, path, body }: FakeRequest): Response {
    if (path === '/tasks' && method === 'GET') return jsonResponse(data);
    if (path === '/tasks' && method === 'POST') {
      if (!isRecord(body)) return new Response('Bad body', { status: 400 });
      if (typeof body.id === 'string' && indexOf(body.id) !== -1) {
        return new Response('Error: Insert failed, duplicate id', { status: 500 });
      }
      data.push({ ...body });
      return jsonResponse(body, 201);
    }
    const match = /^\/tasks\/([^/]+)$/.exec(path);
    const id = match?.[1] === undefined ? '' : decodeURIComponent(match[1]);
    const index = indexOf(id);
    if (match === null) return new Response('Not found', { status: 404 });
    if (index === -1) return jsonResponse({}, 404);
    if (method === 'PATCH' && isRecord(body)) {
      const current = data[index];
      const updated = { ...(isRecord(current) ? current : {}), ...body };
      data[index] = updated;
      return jsonResponse(updated);
    }
    if (method === 'DELETE') {
      data.splice(index, 1);
      return jsonResponse({});
    }
    return new Response('Bad request', { status: 400 });
  }

  const fetchSpy = mockFetch().mockImplementation(async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const rawBody = init?.body;
    const request: FakeRequest = {
      method: init?.method ?? 'GET',
      path: new URL(href).pathname,
      body: typeof rawBody === 'string' ? JSON.parse(rawBody) : undefined,
    };
    requests.push(request);
    const responder = queued.shift();
    if (responder !== undefined) return responder(request, init);
    if (offline) return networkError();
    return answer(request);
  });

  return {
    fetchSpy,
    /** Every request the app sent, in order. */
    requests,
    /** The tasks the "server" holds right now. */
    get tasks(): unknown[] {
      return data;
    },
    /** The server's copy of one task. */
    task(id: string): unknown {
      return data[indexOf(id)];
    },
    /** Requests other than the first GET. */
    writes(): FakeRequest[] {
      return requests.filter((request) => request.method !== 'GET');
    },
    /** Like stopping json-server: every request fails until goOnline(). */
    goOffline() {
      offline = true;
    },
    goOnline() {
      offline = false;
    },
    /** The next request fails with this status (404, 500, ...) without changing the data. */
    failNext(status: number) {
      queued.push(async () => jsonResponse({}, status));
    },
    /** The next request fails as if the server were off. */
    failNextWithNetworkError() {
      queued.push(networkError);
    },
    /** The next request answers with this raw body (e.g. non-JSON). */
    respondNextWith(body: string, status = 200) {
      queued.push(async () => new Response(body, { status }));
    },
    /**
     * The next request waits until the test calls release(); then the server handles it
     * normally (or fails it with fail(status)). Used to see "Saving…" and double clicks.
     */
    holdNext() {
      const gate = deferred<number | null>();
      queued.push(async (request) => {
        const status = await gate.promise;
        return status === null ? answer(request) : jsonResponse({}, status);
      });
      return {
        release: () => gate.resolve(null),
        fail: (status: number) => gate.resolve(status),
      };
    },
    /** Deletes a task directly on the "server", like another browser tab would. */
    deleteFromAnotherTab(id: string) {
      const index = indexOf(id);
      if (index !== -1) data.splice(index, 1);
    },
  };
}

export type FakeServer = ReturnType<typeof startFakeServer>;
