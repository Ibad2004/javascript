import type { Task } from '../types';
import { deferred, jsonResponse, mockFetch, networkError } from './fetchMock';
import { FAKE_TODAY } from './makeTask';

type FakeUser = { password: string; tasks: Task[] };
export type SeenRequest = {
  method: string;
  path: string;
  search: string;
  authorization: string | null;
  body: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A tiny in-memory task-api behind a fetch spy: signup, login, me, /tasks and /stats,
 * with the same JSON errors ({ error, code?, fields? }). Tokens look like "token-<email>".
 */
export function startFakeTaskApi(initialUsers: Record<string, FakeUser>) {
  const users = new Map(Object.entries(initialUsers));
  const requests: SeenRequest[] = [];
  const expired = new Set<string>();
  let nextId = 0;
  let statsDown = false;
  let offline = false;
  let hold: Promise<unknown> | null = null;

  function userFor(authorization: string | null): { email: string; user: FakeUser } | null {
    const token = authorization?.replace(/^Bearer /, '') ?? '';
    const email = token.replace(/^token-/, '');
    const user = users.get(email);
    return token.startsWith('token-') && user !== undefined ? { email, user } : null;
  }

  function unauthorized(authorization: string | null): Response | null {
    const token = authorization?.replace(/^Bearer /, '') ?? '';
    if (authorization === null) {
      return jsonResponse({ error: 'Log in first', code: 'AUTH_REQUIRED' }, 401);
    }
    if (expired.has(token)) {
      return jsonResponse({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401);
    }
    if (userFor(authorization) === null) {
      return jsonResponse({ error: 'Invalid token', code: 'TOKEN_INVALID' }, 401);
    }
    return null;
  }

  function answer(request: SeenRequest): Response {
    const { method, path, authorization, body } = request;
    const input = isRecord(body) ? body : {};
    const email = typeof input.email === 'string' ? input.email : '';
    const password = typeof input.password === 'string' ? input.password : '';

    if (path === '/auth/signup' && method === 'POST') {
      if (email === 'zod@example.com') {
        return jsonResponse(
          {
            error: 'Invalid data',
            fields: { email: 'email must be a valid email', password: 'password is too weak' },
          },
          400,
        );
      }
      if (users.has(email)) return jsonResponse({ error: 'Email already registered' }, 409);
      users.set(email, { password, tasks: [] });
      return jsonResponse({ user: { email }, token: `token-${email}` }, 201);
    }
    if (path === '/auth/login' && method === 'POST') {
      if (users.get(email)?.password !== password) {
        return jsonResponse({ error: 'Invalid email or password' }, 401);
      }
      expired.delete(`token-${email}`);
      return jsonResponse({ user: { email }, token: `token-${email}` });
    }

    const denied = unauthorized(authorization);
    if (denied !== null) return denied;
    const me = userFor(authorization);
    if (me === null) return denied ?? jsonResponse({}, 401);

    if (path === '/auth/me') return jsonResponse({ user: { email: me.email } });
    if (path === '/stats') {
      if (statsDown) return jsonResponse({ error: 'Stats are down' }, 500);
      const tasks = me.user.tasks;
      const done = tasks.filter((t) => t.done).length;
      const overdue = tasks.filter((t) => !t.done && t.dueDate !== null && t.dueDate < FAKE_TODAY);
      return jsonResponse({
        tz: 'x',
        byStatus: {
          total: tasks.length,
          done,
          pending: tasks.length - done,
          overdue: overdue.length,
        },
        byWeek: [
          { week: '2026-11-02', count: 0 },
          { week: '2026-11-09', count: tasks.length },
        ],
      });
    }
    if (path === '/tasks' && method === 'GET') return jsonResponse(me.user.tasks);
    if (path === '/tasks' && method === 'POST') {
      const task: Task = {
        id: `srv-${++nextId}`,
        title: typeof input.title === 'string' ? input.title : '',
        description: typeof input.description === 'string' ? input.description : '',
        done: false,
        priority: input.priority === 'low' || input.priority === 'high' ? input.priority : 'medium',
        dueDate: typeof input.dueDate === 'string' ? input.dueDate : null,
      };
      me.user.tasks.push(task);
      return jsonResponse(task, 201);
    }
    const match = /^\/tasks\/([^/]+)$/.exec(path);
    const index = me.user.tasks.findIndex((t) => t.id === decodeURIComponent(match?.[1] ?? ''));
    if (match === null || index === -1) return jsonResponse({ error: 'Task not found' }, 404);
    if (method === 'PATCH') {
      const current = me.user.tasks[index];
      if (current === undefined) return jsonResponse({ error: 'Task not found' }, 404);
      const updated: Task = { ...current, ...input };
      me.user.tasks[index] = updated;
      return jsonResponse(updated);
    }
    if (method === 'DELETE') {
      me.user.tasks.splice(index, 1);
      return new Response(null, { status: 204 });
    }
    return jsonResponse({ error: 'Bad request' }, 400);
  }

  const fetchSpy = mockFetch().mockImplementation(async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href);
    const headers = new Headers(init?.headers);
    const rawBody = init?.body;
    const request: SeenRequest = {
      method: init?.method ?? 'GET',
      path: url.pathname,
      search: url.search,
      authorization: headers.get('Authorization'),
      body: typeof rawBody === 'string' ? JSON.parse(rawBody) : undefined,
    };
    requests.push(request);
    if (offline) return networkError();
    if (hold !== null && request.method === 'GET' && request.path === '/tasks') await hold;
    return answer(request);
  });

  return {
    fetchSpy,
    requests,
    users,
    /** The next calls with this user's token answer 401 TOKEN_EXPIRED. */
    expireToken(email: string) {
      expired.add(`token-${email}`);
    },
    failStats(down = true) {
      statsDown = down;
    },
    goOffline() {
      offline = true;
    },
    /** GET /tasks waits until release() is called. */
    holdTaskList() {
      const gate = deferred<null>();
      hold = gate.promise;
      return {
        release: () => {
          hold = null;
          gate.resolve(null);
        },
      };
    },
    tasksOf(email: string): Task[] {
      return users.get(email)?.tasks ?? [];
    },
  };
}
