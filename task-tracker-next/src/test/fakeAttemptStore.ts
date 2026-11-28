/** An in-memory stand-in for src/lib/attemptData.ts. Window expiry is the database's job. */
export function fakeAttemptStore() {
  const counts = new Map<string, number>();
  return {
    async countAttempt(key: string, max: number): Promise<number> {
      const count = Math.min((counts.get(key) ?? 0) + 1, max + 1);
      counts.set(key, count);
      return count;
    },
    async deleteAttempts(key: string): Promise<void> {
      counts.delete(key);
    },
    reset(): void {
      counts.clear();
    },
  };
}
