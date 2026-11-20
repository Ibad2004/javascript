/**
 * The login session: { token, email }, kept in memory and in localStorage ("task-tracker:auth").
 * It lives outside React so the one file that calls fetch (serverApi.ts) can read the token,
 * and React reads it with useSyncExternalStore. Storage can be blocked: then it works in memory.
 */

export const AUTH_KEY = 'task-tracker:auth';

export type AuthState = {
  token: string | null;
  email: string | null;
  /** Goes up at every login and logout, so the app can start from a clean slate (key=). */
  sessionId: number;
  /** "Your session expired…", shown on the login page. */
  message: string | null;
};

let state: AuthState = { token: null, email: null, sessionId: 0, message: null };
let loaded = false;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseSaved(raw: string | null): { token: string; email: string } | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
    const token: unknown = 'token' in data ? data.token : undefined;
    const email: unknown = 'email' in data ? data.email : undefined;
    return typeof token === 'string' && token !== '' && typeof email === 'string'
      ? { token, email }
      : null;
  } catch {
    return null;
  }
}

function readSaved() {
  try {
    return parseSaved(storage()?.getItem(AUTH_KEY) ?? null);
  } catch {
    return null;
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  const saved = readSaved();
  if (saved !== null) state = { ...state, ...saved };
}

function emit() {
  for (const listener of listeners) listener();
}

function save(saved: { token: string; email: string } | null) {
  try {
    const store = storage();
    if (store === null) return;
    if (saved === null) store.removeItem(AUTH_KEY);
    else store.setItem(AUTH_KEY, JSON.stringify(saved));
  } catch {
    // Blocked or full: the session still works in memory.
  }
}

export function getAuthState(): AuthState {
  load();
  return state;
}

export function getToken(): string | null {
  return getAuthState().token;
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startSession(token: string, email: string) {
  load();
  state = { token, email, sessionId: state.sessionId + 1, message: null };
  save({ token, email });
  emit();
}

/** Forget the session. `message` is shown on the login page (e.g. the session expired). */
export function endSession(message: string | null = null) {
  load();
  if (state.token === null && message === null) return;
  state = { token: null, email: null, sessionId: state.sessionId + 1, message };
  save(null);
  emit();
}

/** Another tab logged in or out: copy what it saved. We never write back (no ping-pong). */
function onStorage(event: StorageEvent) {
  if (event.key !== AUTH_KEY && event.key !== null) return;
  load();
  const saved = event.key === null ? null : parseSaved(event.newValue);
  if (saved === null) {
    if (state.token === null) return;
    state = { token: null, email: null, sessionId: state.sessionId + 1, message: null };
    emit();
  } else if (saved.token !== state.token) {
    state = { ...saved, sessionId: state.sessionId + 1, message: null };
    emit();
  }
}

if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

/** Tests only: forget everything in memory; the next read starts from localStorage again. */
export function resetAuthStoreForTests() {
  state = { token: null, email: null, sessionId: 0, message: null };
  loaded = false;
  emit();
}
