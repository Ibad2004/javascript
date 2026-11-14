import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { TasksSource } from '../api/source';
import { useTasks, type TasksApi } from '../hooks/useTasks';

const TasksContext = createContext<TasksApi | null>(null);

type TasksProviderProps = {
  children: ReactNode;
  /** Makes the id of a new task. Tests pass a fake one to get predictable ids. */
  makeId?: () => string;
  /** Tests pass a browser-storage source; the app uses the one VITE_DATA_SOURCE picks. */
  source?: TasksSource;
};

/**
 * Calls useTasks ONCE, above the routes, so every page shares the same tasks,
 * busy guard and Undo slot (a delete on the detail page can be undone on the list).
 */
export function TasksProvider({ children, makeId, source }: TasksProviderProps) {
  const value = useTasks({
    ...(makeId === undefined ? {} : { makeId }),
    ...(source === undefined ? {} : { source }),
  });
  return <TasksContext value={value}>{children}</TasksContext>;
}

// The provider and its hook belong together; fast refresh just reloads this file in full.
// oxlint-disable-next-line react/only-export-components
export function useTasksContext(): TasksApi {
  const value = useContext(TasksContext);
  if (value === null) {
    throw new Error('useTasksContext must be used inside <TasksProvider>.');
  }
  return value;
}
