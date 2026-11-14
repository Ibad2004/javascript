import seedFile from '../../db.seed.json';
import type { Task } from '../types';
import { addDays, toLocalDateString } from '../utils/dates';
import type { SourceEvent, TasksSource } from './source';
import { ApiError, readTaskList, type LoadedTasks, type TaskChanges } from './tasks';

/**
 * The same four functions as src/api/tasks.ts, but the tasks live in this browser's
 * localStorage under ONE key. Used for the live demo on Vercel, where there is no server.
 *
 * Storage is untrusted (the user, an extension or an old version can write anything):
 * bad items are skipped and counted; a value that is not a JSON list is copied to a backup
 * key and replaced by the sample tasks. If storage is blocked (private mode, site data off)
 * or full, the app keeps working in memory and says that changes can't be saved.
 */

export const STORAGE_KEY = 'task-tracker:tasks:v1';
export const BACKUP_KEY = 'task-tracker:tasks:v1:backup';

export const LOCAL_MESSAGES = {
  cantSave:
    "Changes can't be saved in this browser (storage is blocked or full). They stay until you close or reload this tab.",
  damaged:
    'The tasks saved in this browser could not be read, so the sample tasks were put back. A copy of the old data was kept.',
} as const;

type LocalOptions = {
  /** Returns localStorage, or null when it is blocked. Tests pass a fake. */
  getStorage?: () => Storage | null;
  /** The user's local date, "YYYY-MM-DD", for the sample due dates. */
  today?: () => string;
  /** Where the "storage" event comes from (another tab). */
  eventTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
};

/** Even READING window.localStorage can throw (SecurityError when site data is blocked). */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** db.seed.json → tasks with real due dates ("dueInDays": -1 = yesterday, null = none). */
export function buildSampleTasks(seed: unknown, today: string): Task[] {
  const items = isRecord(seed) && Array.isArray(seed.tasks) ? seed.tasks : [];
  const withDates = items.map((item: unknown) => {
    if (!isRecord(item)) return item;
    const { dueInDays, ...rest } = item;
    const dueDate =
      typeof dueInDays === 'number' && Number.isInteger(dueInDays)
        ? addDays(today, dueInDays)
        : null;
    return { ...rest, dueDate };
  });
  return readTaskList(withDates).tasks;
}

export function createLocalSource({
  getStorage = browserStorage,
  today = () => toLocalDateString(new Date()),
  eventTarget = typeof window === 'undefined' ? undefined : window,
}: LocalOptions = {}): TasksSource {
  // The copy in memory. The source of truth only while storage is blocked or full.
  let memory: Task[] | null = null;
  const listeners = new Set<(event: SourceEvent) => void>();

  function emit(event: SourceEvent) {
    for (const listener of listeners) listener(event);
  }

  function samples(): Task[] {
    return buildSampleTasks(seedFile, today());
  }

  /** Saves the list. false = it could not be saved (blocked or quota): memory keeps it. */
  function persist(tasks: Task[]): boolean {
    memory = tasks;
    const storage = getStorage();
    if (storage === null) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch {
      // QuotaExceededError or SecurityError: keep working, say so.
      return false;
    }
  }

  /** Reads the list fresh from storage every time, so a change from another tab is never lost. */
  function load(): LoadedTasks {
    const storage = getStorage();
    let raw: string | null;
    try {
      if (storage === null) throw new Error('blocked');
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      // Blocked: the memory copy, or the samples the first time.
      memory ??= samples();
      return { tasks: memory, skipped: 0, warning: LOCAL_MESSAGES.cantSave };
    }

    if (raw === null) {
      // First visit (or after the data was cleared): start with the sample tasks.
      const tasks = samples();
      return persist(tasks)
        ? { tasks, skipped: 0 }
        : { tasks, skipped: 0, warning: LOCAL_MESSAGES.cantSave };
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = undefined;
    }
    if (!Array.isArray(data)) {
      // The whole value is broken: keep a copy, start again from the samples, and say so.
      try {
        storage.setItem(BACKUP_KEY, raw);
      } catch {
        // No room for the copy either; the samples are still better than a blank page.
      }
      const tasks = samples();
      persist(tasks);
      return { tasks, skipped: 0, warning: LOCAL_MESSAGES.damaged };
    }

    const result = readTaskList(data);
    memory = result.tasks;
    return result;
  }

  /** Every change: read the current list, change it, save it. A failed save is reported. */
  function change(update: (tasks: Task[]) => Task[]): void {
    const { tasks } = load();
    if (!persist(update(tasks))) emit({ type: 'warning', message: LOCAL_MESSAGES.cantSave });
  }

  function onStorage(event: StorageEvent) {
    // key null = another tab called localStorage.clear().
    if (event.key === STORAGE_KEY || event.key === null) emit({ type: 'changed' });
  }

  return {
    kind: 'local',
    where: 'Saved in this browser',

    async getTasks(signal) {
      if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
      return load();
    },

    async createTask(task) {
      let saved = task;
      change((tasks) => {
        // Same rule as json-server: an id that already exists is refused.
        if (tasks.some((t) => t.id === task.id)) throw new ApiError('refused');
        saved = { ...task };
        return [...tasks, saved];
      });
      return saved;
    },

    async updateTask(id, changedFields: TaskChanges) {
      let saved: Task | undefined;
      change((tasks) => {
        const current = tasks.find((t) => t.id === id);
        if (current === undefined) throw new ApiError('not-found');
        const updated: Task = { ...current, ...changedFields };
        saved = updated;
        return tasks.map((t) => (t.id === id ? updated : t));
      });
      if (saved === undefined) throw new ApiError('not-found');
      return saved;
    },

    async deleteTask(id) {
      change((tasks) => {
        if (!tasks.some((t) => t.id === id)) throw new ApiError('not-found');
        return tasks.filter((t) => t.id !== id);
      });
    },

    subscribe(listener) {
      if (listeners.size === 0) eventTarget?.addEventListener('storage', onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) eventTarget?.removeEventListener('storage', onStorage);
      };
    },

    async resetDemoData() {
      const tasks = samples();
      return persist(tasks)
        ? { tasks, skipped: 0 }
        : { tasks, skipped: 0, warning: LOCAL_MESSAGES.cantSave };
    },
  };
}
