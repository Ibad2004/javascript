// Where to go after logging in. `next` comes from the URL, so anyone can write anything in it.

export const DEFAULT_NEXT = "/tasks";
const FAKE_ORIGIN = "http://app.invalid";
const NEXT_MAX = 2000;

/**
 * Returns `next` only when it is a path on this site. Otherwise /tasks (no open redirect).
 * Rejected: full URLs, "//host", backslashes (browsers read "/\host" as "//host") and
 * control characters (the URL parser removes tabs and newlines, so "/\t/host" becomes "//host").
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || next.length > NEXT_MAX) return DEFAULT_NEXT;
  if (!next.startsWith("/") || next.startsWith("//")) return DEFAULT_NEXT;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return DEFAULT_NEXT;

  // "/..//host" is still on this site, but its normalised path starts with "//".
  const url = new URL(next, FAKE_ORIGIN);
  if (url.origin !== FAKE_ORIGIN || url.pathname.startsWith("//")) return DEFAULT_NEXT;
  return next;
}

/** The login URL that brings the user back to `path` afterwards. */
export function loginPath(path: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(path))}`;
}
