import { Route, Routes } from 'react-router';
import type { TasksSource } from './api/source';
import { Header } from './components/Header';
import { LiveRegion } from './components/LiveRegion';
import { TasksProvider, useTasksContext } from './context/TasksContext';
import { useFocusHeadingOnNavigation } from './hooks/useFocusHeadingOnNavigation';
import { NotFoundPage } from './pages/NotFoundPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { TaskListPage } from './pages/TaskListPage';

type AppProps = {
  /** The user's local date, "YYYY-MM-DD". main.tsx passes the real one; tests pass a fake one. */
  today: string;
  /** Makes the id of a new task. Tests pass a fake one to get predictable ids. */
  makeId?: () => string;
  /** Where the tasks live. Default: the source VITE_DATA_SOURCE picks. Tests pass their own. */
  source?: TasksSource;
};

/** The router itself is outside (BrowserRouter in main.tsx, MemoryRouter in tests). */
export function App({ today, makeId, source }: AppProps) {
  return (
    <TasksProvider
      {...(makeId === undefined ? {} : { makeId })}
      {...(source === undefined ? {} : { source })}
    >
      <AppRoutes today={today} />
    </TasksProvider>
  );
}

function AppRoutes({ today }: { today: string }) {
  const { announcement } = useTasksContext();
  useFocusHeadingOnNavigation();

  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<TaskListPage today={today} />} />
        {/* A trailing slash (/tasks/5/) matches too. */}
        <Route path="/tasks/:id" element={<TaskDetailPage today={today} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {/* Outside the routes: it stays on the page, so messages survive a navigation. */}
      <LiveRegion announcement={announcement} />
    </div>
  );
}
