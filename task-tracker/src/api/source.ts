import type { Task } from '../types';
import type { LoadedTasks, TaskChanges } from './tasks';

/** Something another tab did, or a problem saving, that the page should react to. */
export type SourceEvent = { type: 'changed' } | { type: 'warning'; message: string };

/**
 * What useTasks needs from a data source. json-server (src/api/tasks.ts) and the browser's
 * localStorage (src/api/localTasks.ts) both provide it, so the hook never knows which one it has.
 */
export type TasksSource = {
  kind: 'api' | 'local';
  /** The header note: where the data lives. */
  where: string;
  getTasks: (signal?: AbortSignal) => Promise<LoadedTasks>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (id: string, changedFields: TaskChanges) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  /** Tells the page about changes from another tab and saving problems. Returns "unsubscribe". */
  subscribe: (listener: (event: SourceEvent) => void) => () => void;
  /** Only the browser source can put the sample tasks back. */
  resetDemoData?: () => Promise<LoadedTasks>;
};

export type SourceKind = TasksSource['kind'];

/** VITE_DATA_SOURCE → which source. Anything but "local" (any case, spaces) means json-server. */
export function pickSourceKind(value: unknown): SourceKind {
  return typeof value === 'string' && value.trim().toLowerCase() === 'local' ? 'local' : 'api';
}
