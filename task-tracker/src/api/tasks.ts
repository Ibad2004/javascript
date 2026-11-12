import type { Priority, Task, TaskInput } from '../types';

/**
 * The ONLY file that talks to the server. Components never call fetch themselves:
 * they call these functions and get either clean Task objects or an ApiError
 * with a message that can be shown to the user as it is.
 */

const DEFAULT_API_URL = 'http://localhost:3001';
export const REQUEST_TIMEOUT_MS = 8000;

function readApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  const url =
    typeof fromEnv === 'string' && fromEnv.trim() !== '' ? fromEnv.trim() : DEFAULT_API_URL;
  return url.replace(/\/+$/, '');
}

export const API_URL = readApiUrl();

export type ApiErrorKind = 'network' | 'timeout' | 'not-found' | 'server' | 'refused' | 'bad-data';

export const API_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Can't reach the server. Is it running? (npm run api)",
  timeout: 'The server is taking too long',
  'not-found': 'This task no longer exists',
  server: 'The server had a problem. Try again.',
  refused: 'The server refused the request.',
  'bad-data': "The server sent data the app can't read.",
};

/** Every failed request ends as one of these. `message` is always safe to show. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, status: number | null = null) {
    super(API_MESSAGES[kind]);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'not-found';
}

/** Any error → a sentence for the user. Never a raw "TypeError: Failed to fetch". */
export function toUserMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 404) return 'not-found';
  if (status >= 500) return 'server';
  return 'refused';
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** The caller's signal (e.g. the effect's AbortController). */
  signal?: AbortSignal;
};

/**
 * fetch + an 8 s timeout + the caller's signal, combined into ONE AbortController.
 * (setTimeout instead of AbortSignal.timeout so tests can use fake timers.)
 * Returns the parsed JSON body as `unknown`: the callers must check it.
 * If the CALLER aborted, the original AbortError is re-thrown so the caller can ignore it.
 */
async function request(path: string, { method = 'GET', body, signal }: RequestOptions = {}) {
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
    return new ApiError('network');
  }

  try {
    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      throw toError(error);
    }
    if (!response.ok) {
      // We never read an error body (json-server sends an HTML stack trace on 500).
      // Cancel it so the connection is freed instead of waiting for the unread data.
      await response.body?.cancel().catch(() => {});
      throw new ApiError(kindForStatus(response.status), response.status);
    }

    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw toError(error);
    }
    // An empty body (e.g. 204 No Content) is fine for DELETE; getTasks rejects it below.
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high';
}

/**
 * Type guard for one task from the server. db.json can be edited by hand,
 * so nothing is trusted: wrong types, a missing id or an empty title fail the check.
 * A due date that is a string but not a real date is kept: the list shows it as
 * "Unknown date (...)" (Day 11), and the edit form asks for a valid one.
 */
export function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    typeof value.title === 'string' &&
    value.title.trim() !== '' &&
    typeof value.description === 'string' &&
    typeof value.done === 'boolean' &&
    isPriority(value.priority) &&
    (value.dueDate === null || typeof value.dueDate === 'string')
  );
}

/** Only the Task fields: extra properties in db.json are dropped. */
function cleanTask(task: Task): Task {
  const { id, title, description, done, priority, dueDate } = task;
  return { id, title, description, done, priority, dueDate };
}

function toTask(data: unknown): Task {
  if (!isTask(data)) throw new ApiError('bad-data');
  return cleanTask(data);
}

export type LoadedTasks = {
  tasks: Task[];
  /** Items that failed the type guard (or repeated an id) and were left out. */
  skipped: number;
};

function taskPath(id: string): string {
  return `/tasks/${encodeURIComponent(id)}`;
}

/** GET /tasks. Bad items are skipped and counted; a body that is not a list is an error. */
export async function getTasks(signal?: AbortSignal): Promise<LoadedTasks> {
  const data = await request('/tasks', { signal });
  if (!Array.isArray(data)) throw new ApiError('bad-data');
  const tasks: Task[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    // A repeated id would break React keys and make edits hit the wrong row.
    if (isTask(item) && !seen.has(item.id)) {
      seen.add(item.id);
      tasks.push(cleanTask(item));
    }
  }
  return { tasks, skipped: data.length - tasks.length };
}

/** POST /tasks. The id is made by the app, so Undo can re-create a task with the SAME id. */
export async function createTask(task: Task): Promise<Task> {
  return toTask(await request('/tasks', { method: 'POST', body: cleanTask(task) }));
}

export type TaskChanges = Partial<TaskInput & Pick<Task, 'done'>>;

/** PATCH /tasks/:id with ONLY the changed fields, never the whole old object. */
export async function updateTask(id: string, changedFields: TaskChanges): Promise<Task> {
  return toTask(await request(taskPath(id), { method: 'PATCH', body: changedFields }));
}

/** DELETE /tasks/:id. json-server answers {} on success and 404 when it is already gone. */
export async function deleteTask(id: string): Promise<void> {
  await request(taskPath(id), { method: 'DELETE' });
}
