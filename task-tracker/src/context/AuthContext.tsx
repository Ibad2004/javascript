import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { endSession, getAuthState, startSession, subscribeAuth } from '../api/authStore';
import * as serverApi from '../api/serverApi';
import { clearAllDrafts } from '../utils/drafts';

export type AuthApi = {
  /** false = json-server or browser storage: there is no login at all. */
  enabled: boolean;
  email: string | null;
  token: string | null;
  /** Changes at every login and logout: used as a React key to drop all old data. */
  sessionId: number;
  /** "Your session expired…" (or null), shown on the login page. */
  message: string | null;
  /** true while the saved token is being checked with GET /auth/me. */
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  /** The user asked to leave: token, drafts and (by the key) tasks and stats are dropped. */
  logout: () => void;
};

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const state = useSyncExternalStore(subscribeAuth, getAuthState);
  // A saved token is checked once, at the start. Until then the protected pages wait.
  const [checking, setChecking] = useState(() => enabled && getAuthState().token !== null);

  useEffect(() => {
    if (!checking) return;
    const controller = new AbortController();
    serverApi.getMe(controller.signal).then(
      () => {
        if (!controller.signal.aborted) setChecking(false);
      },
      () => {
        // A 401 already ended the session (serverApi). Other errors (server off): go on,
        // the list page shows "Can't reach the server" with Try again.
        if (!controller.signal.aborted) setChecking(false);
      },
    );
    return () => controller.abort();
  }, [checking]);

  async function login(email: string, password: string) {
    const result = await serverApi.login(email, password);
    startSession(result.token, result.email);
  }

  async function signup(email: string, password: string) {
    const result = await serverApi.signup(email, password);
    startSession(result.token, result.email);
  }

  function logout() {
    clearAllDrafts();
    endSession();
  }

  const value: AuthApi = {
    enabled,
    email: state.email,
    token: state.token,
    sessionId: state.sessionId,
    message: state.message,
    checking: enabled && checking && state.token !== null,
    login,
    signup,
    logout,
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}

// The provider and its hook belong together.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
