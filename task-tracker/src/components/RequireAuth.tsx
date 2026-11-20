import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps every page except login and signup. Without a token: /login?from=<where you were>.
 * When the app has no login (json-server or browser storage) it lets everything through.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { enabled, token, checking } = useAuth();
  const location = useLocation();
  if (!enabled) return children;
  if (token === null) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />;
  }
  if (checking) {
    return (
      <main>
        <p className="load-status" role="status">
          Checking your session…
        </p>
      </main>
    );
  }
  return children;
}
