import { afterEach, describe, expect, it, vi } from 'vitest';
import { callInfo, hangingFetch, jsonResponse, mockFetch, networkError } from '../test/fetchMock';
import { makeTask } from '../test/makeTask';
import {
  API_MESSAGES,
  API_URL,
  ApiError,
  REQUEST_TIMEOUT_MS,
  createTask,
  deleteTask,
  getTasks,
  isTask,
  toUserMessage,
  updateTask,
} from './tasks';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const task = makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-12' });

/** Runs the call and returns the ApiError it fails with. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  if (!(error instanceof ApiError)) throw new Error(`Expected an ApiError, got ${String(error)}`);
  return error;
}

describe('API_URL', () => {
  it('defaults to the local json-server', () => {
    expect(API_URL).toBe('http://localhost:3001');
  });
});

describe('getTasks', () => {
  it('ok: returns the tasks from GET /tasks', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(jsonResponse([task]));
    expect(await getTasks()).toEqual({ tasks: [task], skipped: 0 });
    expect(callInfo(fetchSpy, 0)).toMatchObject({ method: 'GET', path: '/tasks' });
  });

  it('bad items are skipped and counted, no crash', async () => {
    mockFetch().mockResolvedValue(
      jsonResponse([
        task,
        null,
        'text',
        { ...task, id: 'b', done: 'yes' },
        { ...task, id: 'c', priority: 'urgent' },
        { ...task, id: 7 },
        { ...task, id: 'd', title: '   ' },
        { ...task, id: 'e', dueDate: 20261112 },
        { ...task }, // repeats id "a"
        { ...task, id: 'f', extra: 'dropped' },
      ]),
    );
    const result = await getTasks();
    expect(result.tasks.map((t) => t.id)).toEqual(['a', 'f']);
    expect(result.tasks[1]).not.toHaveProperty('extra');
    expect(result.skipped).toBe(8);
  });

  it('an empty list is fine', async () => {
    mockFetch().mockResolvedValue(jsonResponse([]));
    expect(await getTasks()).toEqual({ tasks: [], skipped: 0 });
  });

  it('a body that is not a list is an error', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ tasks: [] }));
    expect((await failure(getTasks())).kind).toBe('bad-data');
  });

  it('non-JSON (e.g. an HTML page) is an error, not a crash', async () => {
    mockFetch().mockResolvedValue(new Response('<html>oops</html>', { status: 200 }));
    const error = await failure(getTasks());
    expect(error.message).toBe("The server sent data the app can't read.");
  });

  it('server off → "Can\'t reach the server"', async () => {
    mockFetch().mockImplementation(networkError);
    expect((await failure(getTasks())).message).toBe(
      "Can't reach the server. Is it running? (npm run api)",
    );
  });

  it('500 → "The server had a problem. Try again."', async () => {
    mockFetch().mockResolvedValue(new Response('Internal error', { status: 500 }));
    const error = await failure(getTasks());
    expect(error.message).toBe('The server had a problem. Try again.');
    expect(error.status).toBe(500);
  });

  it('times out after exactly 8 s', async () => {
    vi.useFakeTimers();
    mockFetch().mockImplementation(hangingFetch);
    let settled = false;
    const result = failure(getTasks()).finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).message).toBe('The server is taking too long');
  });

  it('the caller aborting gives an AbortError (not an ApiError) and clears the timer', async () => {
    vi.useFakeTimers();
    mockFetch().mockImplementation(hangingFetch);
    const controller = new AbortController();
    const result = getTasks(controller.signal).catch((error: unknown) => error);
    controller.abort();
    const error = await result;
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toHaveProperty('name', 'AbortError');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('an already-aborted signal never reaches the server as a live request', async () => {
    const fetchSpy = mockFetch().mockImplementation(hangingFetch);
    const controller = new AbortController();
    controller.abort();
    const error = await getTasks(controller.signal).catch((reason: unknown) => reason);
    expect(error).toHaveProperty('name', 'AbortError');
    expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
});

describe('createTask', () => {
  it('ok: POSTs the task with its own id and returns the saved task', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(jsonResponse(task, 201));
    expect(await createTask(task)).toEqual(task);
    expect(callInfo(fetchSpy, 0)).toEqual({ method: 'POST', path: '/tasks', body: task });
  });

  it('500 (e.g. the id already exists) → server error', async () => {
    mockFetch().mockResolvedValue(new Response('Insert failed, duplicate id', { status: 500 }));
    expect((await failure(createTask(task))).kind).toBe('server');
  });

  it('a saved task that fails the type guard is an error', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ id: 'a' }, 201));
    expect((await failure(createTask(task))).kind).toBe('bad-data');
  });

  it('times out after 8 s', async () => {
    vi.useFakeTimers();
    mockFetch().mockImplementation(hangingFetch);
    const result = failure(createTask(task));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect((await result).kind).toBe('timeout');
  });
});

describe('updateTask', () => {
  it('ok: PATCHes ONLY the changed fields', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(jsonResponse({ ...task, done: true }));
    expect(await updateTask('a', { done: true })).toEqual({ ...task, done: true });
    expect(callInfo(fetchSpy, 0)).toEqual({
      method: 'PATCH',
      path: '/tasks/a',
      body: { done: true },
    });
  });

  it('encodes the id in the URL', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(jsonResponse(task));
    await updateTask('a/b?c', { title: 'x' });
    expect(callInfo(fetchSpy, 0).path).toBe('/tasks/a%2Fb%3Fc');
  });

  it('404 → "This task no longer exists"', async () => {
    mockFetch().mockResolvedValue(jsonResponse({}, 404));
    expect((await failure(updateTask('a', { done: true }))).message).toBe(
      'This task no longer exists',
    );
  });

  it('500, non-JSON and timeout are errors', async () => {
    vi.useFakeTimers();
    const fetchSpy = mockFetch().mockResolvedValueOnce(new Response('', { status: 503 }));
    expect((await failure(updateTask('a', { done: true }))).kind).toBe('server');

    fetchSpy.mockResolvedValueOnce(new Response('not json', { status: 200 }));
    expect((await failure(updateTask('a', { done: true }))).kind).toBe('bad-data');

    fetchSpy.mockImplementationOnce(hangingFetch);
    const result = failure(updateTask('a', { done: true }));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect((await result).kind).toBe('timeout');
  });
});

describe('deleteTask', () => {
  it('ok: DELETE /tasks/:id ({} or an empty body)', async () => {
    const fetchSpy = mockFetch()
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteTask('a')).resolves.toBeUndefined();
    await expect(deleteTask('a')).resolves.toBeUndefined();
    expect(callInfo(fetchSpy, 0)).toMatchObject({ method: 'DELETE', path: '/tasks/a' });
  });

  it('404, 500, server off and timeout are errors', async () => {
    vi.useFakeTimers();
    const fetchSpy = mockFetch().mockResolvedValueOnce(jsonResponse({}, 404));
    expect((await failure(deleteTask('a'))).kind).toBe('not-found');

    fetchSpy.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await failure(deleteTask('a'))).kind).toBe('server');

    fetchSpy.mockImplementationOnce(networkError);
    expect((await failure(deleteTask('a'))).kind).toBe('network');

    fetchSpy.mockImplementationOnce(hangingFetch);
    const result = failure(deleteTask('a'));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect((await result).kind).toBe('timeout');
  });

  it('other 4xx → a clear "refused" message', async () => {
    mockFetch().mockResolvedValue(jsonResponse({}, 400));
    expect((await failure(deleteTask('a'))).message).toBe(API_MESSAGES.refused);
  });
});

describe('isTask and toUserMessage', () => {
  it('accepts a real task and rejects wrong types', () => {
    expect(isTask(task)).toBe(true);
    expect(isTask({ ...task, dueDate: null })).toBe(true);
    expect(isTask([task])).toBe(false);
    expect(isTask({ ...task, description: undefined })).toBe(false);
  });

  it('never shows a raw error to the user', () => {
    expect(toUserMessage(new TypeError('Failed to fetch'))).toBe(
      'Something went wrong. Try again.',
    );
    expect(toUserMessage(new ApiError('timeout'))).toBe('The server is taking too long');
  });
});
