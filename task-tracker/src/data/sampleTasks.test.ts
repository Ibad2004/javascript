import { describe, expect, it } from 'vitest';
import { FAKE_TODAY } from '../test/makeTask';
import { getDueStatus, parseDateOnly } from '../utils/dates';
import { createSampleTasks } from './sampleTasks';

const sampleTasks = createSampleTasks(FAKE_TODAY);

describe('createSampleTasks', () => {
  it('has 6 to 8 tasks', () => {
    expect(sampleTasks.length).toBeGreaterThanOrEqual(6);
    expect(sampleTasks.length).toBeLessThanOrEqual(8);
  });

  it('has unique ids', () => {
    const ids = sampleTasks.map((task) => task.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no empty titles', () => {
    for (const task of sampleTasks) {
      expect(task.title.trim()).not.toBe('');
    }
  });

  it('only uses valid "YYYY-MM-DD" due dates (or null)', () => {
    for (const task of sampleTasks) {
      if (task.dueDate !== null) expect(parseDateOnly(task.dueDate)).not.toBeNull();
    }
  });

  it('covers the edge cases we want to see on screen', () => {
    expect(sampleTasks.some((task) => task.done)).toBe(true);
    expect(sampleTasks.some((task) => !task.done)).toBe(true);
    expect(new Set(sampleTasks.map((task) => task.priority))).toEqual(
      new Set(['low', 'medium', 'high']),
    );
    expect(sampleTasks.some((task) => task.dueDate === null)).toBe(true);
    expect(sampleTasks.some((task) => task.description === '')).toBe(true);
    expect(sampleTasks.some((task) => task.description.includes('\n'))).toBe(true);
    expect(sampleTasks.some((task) => task.title.length >= 80 && !task.title.includes(' '))).toBe(
      true,
    );
    // Urdu uses the Arabic script block.
    expect(sampleTasks.some((task) => /[؀-ۿ]/.test(task.title))).toBe(true);
  });

  it('places the not-done due dates 2 days ago, today, tomorrow and in a week (fake today)', () => {
    const notDoneDates = sampleTasks.filter((task) => !task.done).map((task) => task.dueDate);
    expect(notDoneDates).toEqual(
      expect.arrayContaining(['2026-11-08', '2026-11-10', '2026-11-11', '2026-11-17', null]),
    );
  });

  // Month ends, year ends, leap days and daylight-saving change days.
  const todays = [
    FAKE_TODAY,
    '2026-01-01',
    '2026-03-01',
    '2026-03-29',
    '2026-10-25',
    '2026-11-01',
    '2026-12-31',
    '2028-02-29',
    '2028-03-01',
  ];

  it.each(todays)(
    'built for today = %s, has exactly one "Due today" and one "Overdue" not-done task',
    (today) => {
      const statuses = createSampleTasks(today).map((task) => getDueStatus(task, today));
      expect(statuses.filter((status) => status === 'today')).toHaveLength(1);
      expect(statuses.filter((status) => status === 'overdue')).toHaveLength(1);
    },
  );
});
