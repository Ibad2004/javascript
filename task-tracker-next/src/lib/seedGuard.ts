// The seed creates a demo account with a public password, so it may run on the local
// database only. The live database has another name ("task-tracker-next-prod").
export const SEED_DB = "task-tracker-next";

/** Exact match: no prefix, suffix or different letter case. */
export function isSeedableDatabase(name: string): boolean {
  return name === SEED_DB;
}
