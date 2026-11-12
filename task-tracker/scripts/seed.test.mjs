// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDueStatus, parseDateOnly } from '../src/utils/dates.ts';
import { addDays, buildDb, toLocalDateString } from './seed.mjs';

const seed = JSON.parse(readFileSync(new URL('../db.seed.json', import.meta.url), 'utf8'));
const FAKE_TODAY = '2026-11-10';
const tasks = buildDb(seed, FAKE_TODAY).tasks;

describe('db.seed.json → db.json', () => {
  it('has 6 to 8 tasks with unique ids and no empty titles', () => {
    expect(tasks.length).toBeGreaterThanOrEqual(6);
    expect(tasks.length).toBeLessThanOrEqual(8);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
    for (const task of tasks) expect(task.title.trim()).not.toBe('');
  });

  it('replaces dueInDays with a valid "YYYY-MM-DD" dueDate (or null)', () => {
    for (const task of tasks) {
      expect(task).not.toHaveProperty('dueInDays');
      if (task.dueDate !== null) expect(parseDateOnly(task.dueDate)).not.toBeNull();
    }
  });

  it('covers the edge cases we want to see on screen', () => {
    expect(tasks.some((task) => task.done)).toBe(true);
    expect(tasks.some((task) => !task.done)).toBe(true);
    expect(new Set(tasks.map((task) => task.priority))).toEqual(new Set(['low', 'medium', 'high']));
    expect(tasks.some((task) => task.dueDate === null)).toBe(true);
    expect(tasks.some((task) => task.description === '')).toBe(true);
    expect(tasks.some((task) => task.description.includes('\n'))).toBe(true);
    expect(tasks.some((task) => task.title.length >= 80 && !task.title.includes(' '))).toBe(true);
    expect(tasks.some((task) => /[؀-ۿ]/.test(task.title))).toBe(true);
  });

  it('places the not-done due dates 2 days ago, today, tomorrow and in a week (fake today)', () => {
    const notDoneDates = tasks.filter((task) => !task.done).map((task) => task.dueDate);
    expect(notDoneDates).toEqual(
      expect.arrayContaining(['2026-11-08', '2026-11-10', '2026-11-11', '2026-11-17', null]),
    );
  });

  // Month ends, year ends, leap days and daylight-saving change days.
  it.each([
    FAKE_TODAY,
    '2026-01-01',
    '2026-03-01',
    '2026-03-29',
    '2026-10-25',
    '2026-12-31',
    '2028-02-29',
    '2028-03-01',
  ])('built for today = %s, has exactly one "Due today" and one "Overdue" task', (today) => {
    const statuses = buildDb(seed, today).tasks.map((task) => getDueStatus(task, today));
    expect(statuses.filter((status) => status === 'today')).toHaveLength(1);
    expect(statuses.filter((status) => status === 'overdue')).toHaveLength(1);
  });

  it('uses the LOCAL date, not the UTC one (23:30 local is still the same day)', () => {
    expect(toLocalDateString(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(toLocalDateString(new Date(2026, 0, 1, 0, 15))).toBe('2026-01-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rejects a broken seed with a clear message', () => {
    expect(() => buildDb({}, FAKE_TODAY)).toThrow('must look like');
    expect(() => buildDb({ tasks: [{ id: 'x', dueInDays: 1.5 }] }, FAKE_TODAY)).toThrow(
      'whole number or null',
    );
    expect(() => addDays('12/11/2026', 1)).toThrow('YYYY-MM-DD');
  });
});
