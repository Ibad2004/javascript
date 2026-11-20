import { createLocalSource } from './localTasks';
import { serverSource } from './serverApi';
import { pickSourceKind, type TasksSource } from './source';
import { createTask, deleteTask, getTasks, updateTask } from './tasks';

/** json-server: the same four functions; another tab's changes are not pushed to us. */
export const apiSource: TasksSource = {
  kind: 'api',
  where: 'Saved on the local mock server (json-server)',
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  subscribe: () => () => {},
};

/**
 * The source the app uses, chosen at build time by VITE_DATA_SOURCE:
 * "server" (npm run dev: the real task-api), "api" (json-server) or "local" (.env.production, Vercel).
 */
export function chooseSource(value: unknown): TasksSource {
  const kind = pickSourceKind(value);
  if (kind === 'local') return createLocalSource();
  return kind === 'server' ? serverSource : apiSource;
}

export const defaultSource: TasksSource = chooseSource(import.meta.env.VITE_DATA_SOURCE);
