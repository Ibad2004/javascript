/**
 * Open-redirect guard for /login?from=<path>. Only a path INSIDE this app is allowed:
 * it must start with exactly one "/" ("//evil.com", "/\evil.com" and "https://evil.com" are not).
 * Anything else becomes "/".
 */
export function safeFrom(value: string | null): string {
  if (value === null || value === '') return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  // Backslashes and control characters (tab, newline) are treated like "/" by browsers:
  // "/\evil.com" or "/<tab>/evil.com" would become "//evil.com".
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (char === '\\' || code < 0x20 || code === 0x7f) return '/';
  }
  return value;
}
