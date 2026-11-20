import type { Task } from '../types';
import { endSession, getToken } from './authStore';
import type { Stats, TasksSource } from './source';
import {
  ApiError,
  REQUEST_TIMEOUT_MS,
  cleanTask,
  isTask,
  readTaskList,
  type LoadedTasks,
  type TaskChanges,
} from './tasks';

/**
 * The ONLY file that calls fetch for the real task-api (http://localhost:4000).
 * Same four task functions as the other sources, plus login, signup, "me" and stats.
 * Every request carries "Authorization: Bearer <token>". A 401 on any call ends the session.
 */

const DEFAULT_URL = 'http://localhost:4000';
export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';
export const SERVER_MESSAGES = {
  network:
    "Can't reach the server. Is task-api running? (npm run dev in task-api) " +
    'If it is running, check the CORS_ORIGINS setting of task-api: a CORS block looks like a network error too.',
  login: 'Invalid email or password',
  emailTaken: 'Email already registered',
} as const;

function readUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  const url = typeof fromEnv === 'string' && fromEnv.trim() !== '' ? fromEnv.trim() : DEFAULT_URL;
  return url.replace(/\/+$/, '');
}

const SERVER_URL = readUrl();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The API's error body: { error, code?, fields? }. Anything else is ignored. */
function readErrorBody(text: string): {
  error?: string;
  code?: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data)) return { fields };
    if (isRecord(data.fields)) {
      for (const [key, value] of Object.entries(data.fields)) {
        if (typeof value === 'string') fields[key] = value;
      }
    }
    return {
      fields,
      ...(typeof data.error === 'string' ? { error: data.error } : {}),
      ...(typeof data.code === 'string' ? { code: data.code } : {}),
    };
  } catch {
    return { fields };
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** false for login and signup: a 401 there is "wrong password", not "session over". */
  endSessionOn401?: boolean;
};

async function request(
  path: string,
  { method = 'GET', body, signal, endSessionOn401 = true }: RequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  function toError(error: unknown): unknown {
    if (signal?.aborted) return error;
    if (timedOut) return new ApiError('timeout');
    return new ApiError('network', null, { message: SERVER_MESSAGES.network });
  }

  // The token this request was sent with: a late 401 must not log out a NEWER session.
  const sentToken = getToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sentToken !== null) headers.Authorization = `Bearer ${sentToken}`;

  try {
    let response: Response;
    try {
      response = await fetch(`${SERVER_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      throw toError(error);
    }

    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw toError(error);
    }

    if (!response.ok) {
      const { error, code, fields } = readErrorBody(text);
      const extra = {
        fields,
        ...(error === undefined ? {} : { message: error }),
        ...(code === undefined ? {} : { code }),
      };
      if (response.status === 401) {
        if (endSessionOn401 && sentToken !== null && getToken() === sentToken) {
          endSession(code === 'TOKEN_EXPIRED' ? SESSION_EXPIRED_MESSAGE : null);
        }
        throw new ApiError('unauthorized', 401, {
          ...extra,
          message: error ?? 'Please log in again.',
        });
      }
      if (response.status === 404) throw new ApiError('not-found', 404, extra);
      if (response.status === 409) throw new ApiError('conflict', 409, extra);
      if (response.status === 400) throw new ApiError('invalid', 400, extra);
      if (response.status >= 500) throw new ApiError('server', response.status);
      throw new ApiError('refused', response.status);
    }

    if (text.trim() === '') return null;
    try {
      const data: unknown = JSON.parse(text);
      return data;
    } catch {
      throw new ApiError('bad-data', response.status);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

function toTask(data: unknown): Task {
  if (!isTask(data)) throw new ApiError('bad-data');
  return cleanTask(data);
}

function taskPath(id: string): string {
  return `/tasks/${encodeURIComponent(id)}`;
}

function toStats(data: unknown): Stats {
  const status = isRecord(data) && isRecord(data.byStatus) ? data.byStatus : null;
  const weeks = isRecord(data) && Array.isArray(data.byWeek) ? data.byWeek : null;
  if (status === null || weeks === null) throw new ApiError('bad-data');
  const { done, pending, overdue } = status;
  const last: unknown = weeks[weeks.length - 1];
  const count = isRecord(last) ? last.count : undefined;
  if (
    typeof done !== 'number' ||
    typeof pending !== 'number' ||
    typeof overdue !== 'number' ||
    typeof count !== 'number'
  ) {
    throw new ApiError('bad-data');
  }
  return { done, pending, overdue, thisWeek: count };
}

export type AuthResult = { token: string; email: string };

function toAuthResult(data: unknown): AuthResult {
  const user = isRecord(data) ? data.user : undefined;
  if (
    isRecord(data) &&
    typeof data.token === 'string' &&
    isRecord(user) &&
    typeof user.email === 'string'
  ) {
    return { token: data.token, email: user.email };
  }
  throw new ApiError('bad-data');
}

/** POST /auth/login. A 401 here means a wrong email or password (never the same as "expired"). */
export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    return toAuthResult(
      await request('/auth/login', {
        method: 'POST',
        body: { email, password },
        endSessionOn401: false,
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'unauthorized') {
      throw new ApiError('unauthorized', 401, { message: SERVER_MESSAGES.login });
    }
    throw error;
  }
}

/** POST /auth/signup. 409 = the email is taken; 400 carries Zod `fields`. */
export async function signup(email: string, password: string): Promise<AuthResult> {
  try {
    return toAuthResult(
      await request('/auth/signup', {
        method: 'POST',
        body: { email, password },
        endSessionOn401: false,
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'conflict') {
      throw new ApiError('conflict', 409, {
        message: SERVER_MESSAGES.emailTaken,
        fields: { email: SERVER_MESSAGES.emailTaken },
      });
    }
    throw error;
  }
}

/** GET /auth/me: is the saved token still good? Returns the user's email. */
export async function getMe(signal?: AbortSignal): Promise<string> {
  const data = await request('/auth/me', { signal });
  const user = isRecord(data) ? data.user : undefined;
  if (!isRecord(user) || typeof user.email !== 'string') throw new ApiError('bad-data');
  return user.email;
}

export async function getStats(timeZone: string, signal?: AbortSignal): Promise<Stats> {
  return toStats(await request(`/stats?tz=${encodeURIComponent(timeZone)}`, { signal }));
}

export async function getTasks(signal?: AbortSignal): Promise<LoadedTasks> {
  const data = await request('/tasks', { signal });
  if (!Array.isArray(data)) throw new ApiError('bad-data');
  return readTaskList(data);
}

/** POST /tasks. The server makes the id: ours is not sent, the returned task is used. */
export async function createTask(task: Task): Promise<Task> {
  const { title, description, priority, dueDate } = task;
  return toTask(
    await request('/tasks', { method: 'POST', body: { title, description, priority, dueDate } }),
  );
}

export async function updateTask(id: string, changedFields: TaskChanges): Promise<Task> {
  return toTask(await request(taskPath(id), { method: 'PATCH', body: changedFields }));
}

export async function deleteTask(id: string): Promise<void> {
  await request(taskPath(id), { method: 'DELETE' });
}

export const serverSource: TasksSource = {
  kind: 'server',
  where: 'Saved on task-api (your account)',
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  subscribe: () => () => {},
  getStats,
};
