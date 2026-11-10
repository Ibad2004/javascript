import { describe, expect, it } from 'vitest';
import { parseDateOnly } from '../utils/dates';
import { sampleTasks } from './sampleTasks';

describe('sampleTasks', () => {
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
});
