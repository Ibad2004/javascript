import { describe, expect, it, vi } from 'vitest';
import { FakeStorage } from '../test/fakeStorage';
import { makeTask } from '../test/makeTask';
import {
  BACKUP_KEY,
  LOCAL_MESSAGES,
  STORAGE_KEY,
  buildSampleTasks,
  createLocalSource,
} from './localTasks';
import { pickSourceKind } from './source';
import { chooseSource, defaultSource } from './index';

const TODAY = '2026-11-10';

function setup(initial?: string) {
  const storage = new FakeStorage();
  if (initial !== undefined) storage.data.set(STORAGE_KEY, initial);
  const events = new EventTarget();
  const source = createLocalSource({
    getStorage: () => storage,
    today: () => TODAY,
    eventTarget: {
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    },
  });
  return {
    storage,
    source,
    events,
    saved: () => JSON.parse(storage.data.get(STORAGE_KEY) ?? 'null'),
  };
}

const a = makeTask({ id: 'a', title: 'Task A' });
const b = makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' });

describe('browser storage source: first visit', () => {
  it('empty storage → the sample tasks, saved, with due dates from the LOCAL today', async () => {
    const { source, saved } = setup();
    const result = await source.getTasks();
    expect(result.tasks).toHaveLength(8);
    expect(result.skipped).toBe(0);
    expect(result.warning).toBeUndefined();
    expect(saved()).toEqual(result.tasks);
    // dueInDays 0 / -2 / 7 / null from db.seed.json, relative to the fake today.
    const dates = result.tasks.map((task) => task.dueDate);
    expect(dates).toEqual(expect.arrayContaining(['2026-11-10', '2026-11-08', '2026-11-17', null]));
    expect(result.tasks.every((task) => !('dueInDays' in task))).toBe(true);
  });

  it('the samples cross a month end correctly (today = 30 Nov)', () => {
    const tasks = buildSampleTasks({ tasks: [{ ...a, dueInDays: 1 }] }, '2026-11-30');
    expect(tasks[0]?.dueDate).toBe('2026-12-01');
  });

  it('a broken seed gives no crash, just fewer samples', () => {
    expect(buildSampleTasks(null, TODAY)).toEqual([]);
    expect(buildSampleTasks({ tasks: [1, { ...a, dueInDays: 'soon' }] }, TODAY)).toEqual([
      { ...a, dueDate: null },
    ]);
  });
});

describe('browser storage source: create, update, delete', () => {
  it('saves every change under ONE key and reads it back', async () => {
    const { source, saved, storage } = setup(JSON.stringify([a]));
    expect(await source.createTask(b)).toEqual(b);
    expect(await source.updateTask('a', { done: true, title: 'Task A2' })).toEqual({
      ...a,
      done: true,
      title: 'Task A2',
    });
    await source.deleteTask('b');
    expect(saved()).toEqual([{ ...a, done: true, title: 'Task A2' }]);
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY]);
    expect((await source.getTasks()).tasks).toEqual(saved());
  });

  it('a missing id → "This task no longer exists" (like a 404), nothing saved', async () => {
    const { source, saved } = setup(JSON.stringify([a]));
    await expect(source.updateTask('zzz', { done: true })).rejects.toMatchObject({
      kind: 'not-found',
      message: 'This task no longer exists',
    });
    await expect(source.deleteTask('zzz')).rejects.toMatchObject({ kind: 'not-found' });
    expect(saved()).toEqual([a]);
  });

  it('creating an id that already exists is refused (Undo never doubles a task)', async () => {
    const { source, saved } = setup(JSON.stringify([a]));
    await expect(source.createTask(a)).rejects.toMatchObject({ kind: 'refused' });
    expect(saved()).toEqual([a]);
  });

  it("reads storage fresh on every change, so another tab's task is kept", async () => {
    const { source, storage, saved } = setup(JSON.stringify([a]));
    await source.getTasks();
    // Another tab adds b directly.
    storage.data.set(STORAGE_KEY, JSON.stringify([a, b]));
    await source.updateTask('a', { done: true });
    expect(saved()).toEqual([{ ...a, done: true }, b]);
  });
});

describe('browser storage source: untrusted data', () => {
  it('bad items are skipped and counted; the good ones stay', async () => {
    const { source } = setup(
      JSON.stringify([a, null, 'x', { ...b, done: 'yes' }, { ...a, title: 'same id' }, b]),
    );
    const result = await source.getTasks();
    expect(result.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(result.skipped).toBe(4);
    expect(result.warning).toBeUndefined();
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['JSON that is not a list', '{"tasks":[]}'],
    ['an empty string', ''],
  ])('%s → a backup copy, the samples, and a message', async (_name, raw) => {
    const { source, storage, saved } = setup(raw);
    const result = await source.getTasks();
    expect(storage.data.get(BACKUP_KEY)).toBe(raw);
    expect(result.tasks).toHaveLength(8);
    expect(saved()).toEqual(result.tasks);
    expect(result.warning).toBe(LOCAL_MESSAGES.damaged);
  });
});

describe('browser storage source: blocked or full', () => {
  it("blocked storage (private mode): works in memory and says changes can't be saved", async () => {
    const source = createLocalSource({ getStorage: () => null, today: () => TODAY });
    const result = await source.getTasks();
    expect(result.tasks).toHaveLength(8);
    expect(result.warning).toMatch(/^Changes can't be saved in this browser/);

    const listener = vi.fn();
    source.subscribe(listener);
    await source.createTask(a);
    expect((await source.getTasks()).tasks).toContainEqual(a);
    expect(listener).toHaveBeenCalledWith({ type: 'warning', message: LOCAL_MESSAGES.cantSave });
  });

  it('reading window.localStorage itself throws (SecurityError): same as blocked', async () => {
    const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access is denied', 'SecurityError');
    });
    const source = createLocalSource({ today: () => TODAY });
    const result = await source.getTasks();
    expect(result.tasks).toHaveLength(8);
    expect(result.warning).toBe(LOCAL_MESSAGES.cantSave);
    expect(getter).toHaveBeenCalled();
  });

  it('a full storage (QuotaExceededError): the change is kept in memory and a warning is sent', async () => {
    const { source, storage } = setup(JSON.stringify([a]));
    const listener = vi.fn();
    source.subscribe(listener);
    storage.full = true;
    expect(await source.updateTask('a', { done: true })).toMatchObject({ done: true });
    expect(listener).toHaveBeenCalledWith({ type: 'warning', message: LOCAL_MESSAGES.cantSave });
    // Storage still has the old value; nothing was half-written.
    expect(JSON.parse(storage.data.get(STORAGE_KEY) ?? '')).toEqual([a]);
  });

  it('first visit with a full storage: the samples show, with the warning', async () => {
    const { source, storage } = setup();
    storage.full = true;
    const result = await source.getTasks();
    expect(result.tasks).toHaveLength(8);
    expect(result.warning).toBe(LOCAL_MESSAGES.cantSave);
  });
});

describe('browser storage source: two tabs and reset', () => {
  it('a "storage" event for our key tells the page; other keys do not', () => {
    const { source, events } = setup();
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);
    events.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    expect(listener).not.toHaveBeenCalled();
    events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    events.dispatchEvent(new StorageEvent('storage', { key: null })); // localStorage.clear()
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith({ type: 'changed' });

    unsubscribe();
    events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('resetDemoData puts the 8 sample tasks back', async () => {
    const { source, saved } = setup(JSON.stringify([a]));
    const result = await source.resetDemoData?.();
    expect(result?.tasks).toHaveLength(8);
    expect(saved()).toEqual(result?.tasks);
  });

  it('an aborted load gives an AbortError (the effect ignores it)', async () => {
    const { source } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(source.getTasks(controller.signal)).rejects.toHaveProperty('name', 'AbortError');
  });
});

describe('choosing the data source (VITE_DATA_SOURCE)', () => {
  it.each([
    ['local', 'local'],
    [' LOCAL ', 'local'],
    ['api', 'api'],
    ['', 'api'],
    ['server', 'api'],
    [undefined, 'api'],
    [42, 'api'],
  ])('%j → %s', (value, kind) => {
    expect(pickSourceKind(value)).toBe(kind);
    expect(chooseSource(value).kind).toBe(kind);
  });

  it('the tests run with no VITE_DATA_SOURCE, so the default is json-server', () => {
    expect(defaultSource.kind).toBe('api');
    expect(defaultSource.where).toBe('Saved on the local mock server (json-server)');
    expect(defaultSource.resetDemoData).toBeUndefined();
  });
});
