import type { Task } from '../types';
import type { LoadedTasks, TaskChanges } from './tasks';

/** Something another tab did, or a problem saving, that the page should react to. */
export type SourceEvent = { type: 'changed' } | { type: 'warning'; message: string };

/**
 * What useTasks needs from a data source. json-server (src/api/tasks.ts) and the browser's
 * localStorage (src/api/localTasks.ts) both provide it, so the hook never knows which one it has.
 */
export type TasksSource = {
  kind: 'api' | 'local' | 'server';
  /** The header note: where the data lives. */
  where: string;
  getTasks: (signal?: AbortSignal) => Promise<LoadedTasks>;
  /** The server source ignores task.id (the server makes ids) and returns the saved task. */
  createTask: (task: Task) => Promise<Task>;
  updateTask: (id: string, changedFields: TaskChanges) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  /** Tells the page about changes from another tab and saving problems. Returns "unsubscribe". */
  subscribe: (listener: (event: SourceEvent) => void) => () => void;
  /** Only the browser source can put the sample tasks back. */
  resetDemoData?: () => Promise<LoadedTasks>;
  /** Only the real task-api has statistics. */
  getStats?: (timeZone: string, signal?: AbortSignal) => Promise<Stats>;
};

export type Stats = { done: number; pending: number; overdue: number; thisWeek: number };

export type SourceKind = TasksSource['kind'];

/** VITE_DATA_SOURCE → which source. "local" or "server" (any case, spaces); anything else = json-server. */
export function pickSourceKind(value: unknown): SourceKind {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return text === 'local' || text === 'server' ? text : 'api';
}
