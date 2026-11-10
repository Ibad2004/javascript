import { describe, expect, it } from 'vitest';
import { FAKE_TODAY } from '../test/makeTask';
import {
  formatDueDate,
  getDueLabel,
  getDueStatus,
  parseDateOnly,
  toLocalDateString,
} from './dates';

describe('formatDueDate', () => {
  it('formats a date-only string as "12 Nov 2026"', () => {
    expect(formatDueDate('2026-11-12')).toBe('12 Nov 2026');
  });

  it('drops the leading zero of the day and handles January and December', () => {
    expect(formatDueDate('2027-01-05')).toBe('5 Jan 2027');
    expect(formatDueDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('shows "No due date" for null', () => {
    expect(formatDueDate(null)).toBe('No due date');
  });

  it('does not crash on an invalid date', () => {
    expect(formatDueDate('2026-02-30')).toBe('Unknown date (2026-02-30)');
    expect(formatDueDate('12/11/2026')).toBe('Unknown date (12/11/2026)');
  });
});

describe('parseDateOnly', () => {
  it('reads the parts as numbers', () => {
    expect(parseDateOnly('2026-11-12')).toEqual({ year: 2026, month: 11, day: 12 });
  });

  it('accepts 29 Feb only in a leap year', () => {
    expect(parseDateOnly('2028-02-29')).not.toBeNull();
    expect(parseDateOnly('2026-02-29')).toBeNull();
  });

  it('rejects month 13 and day 0', () => {
    expect(parseDateOnly('2026-13-01')).toBeNull();
    expect(parseDateOnly('2026-11-00')).toBeNull();
  });
});

describe('toLocalDateString', () => {
  it('uses the local calendar date, even late at night', () => {
    expect(toLocalDateString(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12');
    expect(toLocalDateString(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});

describe('getDueStatus (with a fake today of 2026-11-10)', () => {
  it('is "overdue" for a past date on a not-done task', () => {
    expect(getDueStatus({ done: false, dueDate: '2026-11-09' }, FAKE_TODAY)).toBe('overdue');
  });

  it('is "today" for today', () => {
    expect(getDueStatus({ done: false, dueDate: '2026-11-10' }, FAKE_TODAY)).toBe('today');
  });

  it('is "scheduled" for a future date', () => {
    expect(getDueStatus({ done: false, dueDate: '2026-11-11' }, FAKE_TODAY)).toBe('scheduled');
  });

  it('never marks a done task as overdue or due today', () => {
    expect(getDueStatus({ done: true, dueDate: '2026-01-01' }, FAKE_TODAY)).toBe('scheduled');
    expect(getDueStatus({ done: true, dueDate: FAKE_TODAY }, FAKE_TODAY)).toBe('scheduled');
  });

  it('is "none" when there is no due date', () => {
    expect(getDueStatus({ done: false, dueDate: null }, FAKE_TODAY)).toBe('none');
  });
});

describe('getDueLabel', () => {
  it('gives a readable label for each case', () => {
    expect(getDueLabel({ done: false, dueDate: '2026-11-05' }, FAKE_TODAY)).toBe(
      'Overdue (was due 5 Nov 2026)',
    );
    expect(getDueLabel({ done: false, dueDate: FAKE_TODAY }, FAKE_TODAY)).toBe('Due today');
    expect(getDueLabel({ done: false, dueDate: '2026-11-20' }, FAKE_TODAY)).toBe('Due 20 Nov 2026');
    expect(getDueLabel({ done: true, dueDate: '2026-11-05' }, FAKE_TODAY)).toBe('Due 5 Nov 2026');
    expect(getDueLabel({ done: false, dueDate: null }, FAKE_TODAY)).toBe('No due date');
  });
});
