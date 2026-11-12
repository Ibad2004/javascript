/**
 * Turns db.seed.json into the data json-server serves (db.json).
 *
 * The seed stores "dueInDays" (-1 = yesterday, 0 = today, null = no date) instead of
 * fixed dates, so the demo looks the same on any day. The dates are built from the
 * LOCAL calendar date. We never use toISOString(): it gives the UTC date, which is
 * already "tomorrow" or still "yesterday" for part of the day in many time zones.
 */

/** The LOCAL calendar date as "YYYY-MM-DD". */
export function toLocalDateString(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** addDays('2026-11-30', 1) → '2026-12-01'. Midday, so a daylight-saving change cannot shift the day. */
export function addDays(today, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (match === null) throw new Error(`Expected a "YYYY-MM-DD" date, got "${today}".`);
  const [, year, month, day] = match;
  return toLocalDateString(new Date(Number(year), Number(month) - 1, Number(day) + days, 12));
}

/** { tasks: [{ ..., dueInDays }] } → { tasks: [{ ..., dueDate }] } for the given local `today`. */
export function buildDb(seed, today) {
  if (seed === null || typeof seed !== 'object' || !Array.isArray(seed.tasks)) {
    throw new Error('db.seed.json must look like { "tasks": [ ... ] }.');
  }
  return {
    tasks: seed.tasks.map(({ dueInDays, ...task }) => {
      if (dueInDays !== null && !Number.isInteger(dueInDays)) {
        throw new Error(`Task "${task.id}": dueInDays must be a whole number or null.`);
      }
      return { ...task, dueDate: dueInDays === null ? null : addDays(today, dueInDays) };
    }),
  };
}
