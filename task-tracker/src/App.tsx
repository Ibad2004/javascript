import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { defaultSource } from './api';
import type { TasksSource } from './api/source';
import { RequireAuth } from './components/RequireAuth';
import { Header } from './components/Header';
import { LiveRegion } from './components/LiveRegion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TasksProvider, useTasksContext } from './context/TasksContext';
import { useFocusHeadingOnNavigation } from './hooks/useFocusHeadingOnNavigation';
import { AuthPage } from './pages/AuthPage';
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
export function App({ today, makeId, source = defaultSource }: AppProps) {
  // Only the real task-api has accounts. json-server and browser storage have no login.
  return (
    <AuthProvider enabled={source.kind === 'server'}>
      <AppRoutes today={today} source={source} {...(makeId === undefined ? {} : { makeId })} />
    </AuthProvider>
  );
}

function AppRoutes({
  today,
  source,
  makeId,
}: {
  today: string;
  source: TasksSource;
  makeId?: () => string;
}) {
  const { enabled, sessionId } = useAuth();
  useFocusHeadingOnNavigation();

  return (
    <Routes>
      {enabled && (
        <Route
          path="/login"
          element={
            <PublicShell>
              <AuthPage key={`login-${sessionId}`} mode="login" />
            </PublicShell>
          }
        />
      )}
      {enabled && (
        <Route
          path="/signup"
          element={
            <PublicShell>
              <AuthPage key={`signup-${sessionId}`} mode="signup" />
            </PublicShell>
          }
        />
      )}
      <Route
        path="*"
        element={
          <RequireAuth>
            {/* key: every login and logout starts with NO tasks, drafts or notices of the last user. */}
            <TasksProvider
              key={sessionId}
              source={source}
              {...(makeId === undefined ? {} : { makeId })}
            >
              <AppShell today={today} />
            </TasksProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Header />
      {children}
    </div>
  );
}

function AppShell({ today }: { today: string }) {
  const { announcement, dataLocation } = useTasksContext();
  return (
    <div className="app">
      <Header dataLocation={dataLocation} />
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
