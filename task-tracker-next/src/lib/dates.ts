const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export type DateParts = { year: number; month: number; day: number };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this month (local time, no UTC).
  return new Date(year, month, 0).getDate();
}

/**
 * Reads a "YYYY-MM-DD" string into numbers.
 * We never call new Date("2026-11-12"): that parses as UTC midnight,
 * which shows the previous day in time zones west of UTC.
 */
export function parseDateOnly(value: string): DateParts | null {
  const match = DATE_ONLY.exec(value);
  if (match === null) return null;
  const [, yearText, monthText, dayText] = match;
  if (yearText === undefined || monthText === undefined || dayText === undefined) return null;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** "2026-11-12" → "12 Nov 2026". null → "No due date". */
export function formatDueDate(dueDate: string | null): string {
  if (dueDate === null) return 'No due date';
  const parts = parseDateOnly(dueDate);
  if (parts === null) return `Unknown date (${dueDate})`;
  const monthName = MONTH_NAMES[parts.month - 1] ?? '';
  return `${parts.day} ${monthName} ${parts.year}`;
}

export type DueStatus = 'none' | 'overdue' | 'today' | 'scheduled';

/**
 * Compares the due date with `today` ("YYYY-MM-DD", the user's local date).
 * `today` is passed in so tests can use a fake date.
 * Done tasks are never overdue or "due today".
 */
export function getDueStatus(
  task: { done: boolean; dueDate: string | null },
  today: string,
): DueStatus {
  if (task.dueDate === null || parseDateOnly(task.dueDate) === null) return 'none';
  if (task.done) return 'scheduled';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  return 'scheduled';
}

/** The text shown next to a task, e.g. "Overdue (was due 5 Nov 2026)". */
export function getDueLabel(
  task: { done: boolean; dueDate: string | null },
  today: string,
): string {
  const date = formatDueDate(task.dueDate);
  switch (getDueStatus(task, today)) {
    case 'none':
      return date;
    case 'overdue':
      return `Overdue (was due ${date})`;
    case 'today':
      return 'Due today';
    case 'scheduled':
      return `Due ${date}`;
  }
}

/** The user's LOCAL calendar date as "YYYY-MM-DD" (not the UTC date). */
export function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * addDays('2026-11-30', 1) → '2026-12-01'. Negative numbers go back in time.
 * Built from local date parts: the Date constructor rolls over months and years
 * for us, and we read the result back with local getters (no toISOString, no UTC).
 * Midday is used so a daylight-saving change at midnight can never shift the day.
 */
export function addDays(date: string, days: number): string {
  const parts = parseDateOnly(date);
  if (parts === null) throw new Error(`addDays expects a "YYYY-MM-DD" date, got "${date}".`);
  return toLocalDateString(new Date(parts.year, parts.month - 1, parts.day + days, 12));
}
