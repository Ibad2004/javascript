// A simple in-memory limit on failed logins per email. It is lost on restart and is not
// shared between servers: good enough for learning, not for a deployed app.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
const PRUNE_ABOVE = 10_000;

export function createLoginLimiter(now: () => number = Date.now) {
  const attempts = new Map<string, number[]>();

  function recent(email: string): number[] {
    const since = now() - WINDOW_MS;
    return (attempts.get(email) ?? []).filter((time) => time > since);
  }

  return {
    /**
     * false = blocked. Otherwise the attempt is counted BEFORE the password is checked, so
     * many requests sent at the same moment cannot all get past the limit. A correct
     * password calls clear().
     */
    tryAttempt(email: string): boolean {
      const times = recent(email);
      if (times.length >= MAX_FAILURES) return false;
      attempts.set(email, [...times, now()]);
      // Many made-up emails must not grow the map for ever.
      if (attempts.size > PRUNE_ABOVE) {
        for (const key of attempts.keys()) if (recent(key).length === 0) attempts.delete(key);
      }
      return true;
    },
    clear(email: string): void {
      attempts.delete(email);
    },
  };
}

export const loginLimiter = createLoginLimiter();
