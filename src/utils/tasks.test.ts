import { describe, expect, it } from 'vitest';
import { makeTask } from '../test/makeTask';
import { getListStatusText, getSummaryText, getVisibleTasks, sortTasks } from './tasks';

describe('sortTasks', () => {
  it('puts not-done first, then by due date (no date last), then by title', () => {
    const tasks = [
      makeTask({ id: 'done-early', done: true, dueDate: '2026-01-01', title: 'A' }),
      makeTask({ id: 'no-date', dueDate: null, title: 'A' }),
      makeTask({ id: 'late', dueDate: '2026-12-01', title: 'A' }),
      makeTask({ id: 'early-b', dueDate: '2026-11-01', title: 'Banana' }),
      makeTask({ id: 'early-a', dueDate: '2026-11-01', title: 'Apple' }),
      makeTask({ id: 'done-no-date', done: true, dueDate: null, title: 'A' }),
    ];

    expect(sortTasks(tasks).map((task) => task.id)).toEqual([
      'early-a',
      'early-b',
      'late',
      'no-date',
      'done-early',
      'done-no-date',
    ]);
  });

  it('does not change the original array', () => {
    const tasks = [makeTask({ id: 'b', title: 'B' }), makeTask({ id: 'a', title: 'A' })];
    sortTasks(tasks);
    expect(tasks.map((task) => task.id)).toEqual(['b', 'a']);
  });
});

describe('getVisibleTasks', () => {
  const tasks = [makeTask({ id: '1', done: true }), makeTask({ id: '2', done: false })];

  it('keeps every task when hideDone is false', () => {
    expect(getVisibleTasks(tasks, false)).toHaveLength(2);
  });

  it('removes done tasks when hideDone is true', () => {
    expect(getVisibleTasks(tasks, true).map((task) => task.id)).toEqual(['2']);
  });
});

describe('getSummaryText', () => {
  it('says "No tasks yet" for 0 tasks', () => {
    expect(getSummaryText([])).toBe('No tasks yet');
  });

  it('works for 1 task', () => {
    expect(getSummaryText([makeTask({ id: '1' })])).toBe('0 of 1 done');
    expect(getSummaryText([makeTask({ id: '1', done: true })])).toBe('1 of 1 done');
  });

  it('counts some and all done', () => {
    const some = [
      makeTask({ id: '1', done: true }),
      makeTask({ id: '2' }),
      makeTask({ id: '3', done: true }),
    ];
    expect(getSummaryText(some)).toBe('2 of 3 done');
    const all = some.map((task) => ({ ...task, done: true }));
    expect(getSummaryText(all)).toBe('3 of 3 done');
  });
});

describe('getListStatusText', () => {
  it('covers empty, all hidden and the normal count with plurals', () => {
    expect(getListStatusText(0, 0)).toBe('No tasks yet. Add your first task below.');
    expect(getListStatusText(1, 0)).toBe('Your only task is done, so it is hidden.');
    expect(getListStatusText(3, 0)).toBe('All 3 tasks are done, so they are all hidden.');
    expect(getListStatusText(3, 1)).toBe('Showing 1 task');
    expect(getListStatusText(3, 2)).toBe('Showing 2 tasks');
  });
});
