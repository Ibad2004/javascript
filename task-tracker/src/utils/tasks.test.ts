import { describe, expect, it } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import type { Task, TaskFormValues } from '../types';
import { getChangedFields, replaceTask, setDone } from './tasks';
import {
  EMPTY_FORM_VALUES,
  MESSAGES,
  addTask,
  countChars,
  deleteTask,
  getListStatusText,
  getSummaryText,
  getVisibleTasks,
  isValidDueDate,
  makeId,
  restoreTask,
  sortTasks,
  toFormValues,
  toTaskInput,
  toggleDone,
  updateTask,
  validateTask,
} from './tasks';

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

/** Three tasks, frozen deeply, so any mutation throws in the test. */
function frozenTasks(): readonly Task[] {
  const tasks = [
    makeTask({ id: 'a', title: 'Alpha' }),
    makeTask({ id: 'b', title: 'Beta', done: true }),
    makeTask({ id: 'c', title: 'Gamma' }),
  ];
  for (const task of tasks) Object.freeze(task);
  return Object.freeze(tasks);
}

function snapshot(tasks: readonly Task[]): string {
  return JSON.stringify(tasks);
}

const input = { title: 'New', description: '', priority: 'high', dueDate: null } as const;

describe('countChars', () => {
  it('counts an emoji as one character', () => {
    expect('🛒'.length).toBe(2);
    expect(countChars('🛒')).toBe(1);
    expect(countChars('Buy 🛒')).toBe(5);
    expect(countChars('ہفتہ')).toBe(4);
  });
});

describe('makeId', () => {
  it('gives a different id every time', () => {
    expect(makeId()).not.toBe(makeId());
  });
});

describe('toTaskInput', () => {
  it('trims the text and turns an empty date into null', () => {
    expect(
      toTaskInput({ title: '  Buy milk  ', description: '   ', priority: 'low', dueDate: '' }),
    ).toEqual({ title: 'Buy milk', description: '', priority: 'low', dueDate: null });
  });

  it('round-trips with toFormValues', () => {
    const values: TaskFormValues = {
      title: 'A',
      description: 'B',
      priority: 'high',
      dueDate: '2026-11-12',
    };
    expect(toFormValues(toTaskInput(values))).toEqual(values);
    expect(toFormValues({ ...toTaskInput(values), dueDate: null }).dueDate).toBe('');
  });
});

describe('addTask', () => {
  it('adds a not-done task at the end with the given id', () => {
    const tasks = frozenTasks();
    const before = snapshot(tasks);
    const result = addTask(tasks, input, 'new-id');
    expect(result.map((task) => task.id)).toEqual(['a', 'b', 'c', 'new-id']);
    expect(result[3]).toEqual({ id: 'new-id', done: false, ...input });
    expect(result).not.toBe(tasks);
    expect(snapshot(tasks)).toBe(before);
  });

  it('works on an empty list', () => {
    expect(addTask([], input, 'x')).toHaveLength(1);
  });
});

describe('updateTask', () => {
  it('changes only the edited fields and keeps done and id', () => {
    const tasks = frozenTasks();
    const before = snapshot(tasks);
    const result = updateTask(tasks, 'b', {
      title: 'Beta 2',
      description: 'New text',
      priority: 'low',
      dueDate: '2026-12-01',
    });
    expect(result[1]).toEqual({
      id: 'b',
      title: 'Beta 2',
      description: 'New text',
      priority: 'low',
      dueDate: '2026-12-01',
      done: true,
    });
    // The other tasks are the very same objects (nothing copied for nothing).
    expect(result[0]).toBe(tasks[0]);
    expect(result[1]).not.toBe(tasks[1]);
    expect(snapshot(tasks)).toBe(before);
  });

  it('ignores extra fields, so a stale copy cannot overwrite done', () => {
    const tasks = frozenTasks();
    const staleCopy = { ...makeTask({ id: 'b', title: 'Edited' }), done: false };
    const result = updateTask(tasks, 'b', staleCopy);
    expect(result[1]?.done).toBe(true);
    expect(result[1]?.title).toBe('Edited');
  });

  it('returns the same content when the id does not exist', () => {
    const tasks = frozenTasks();
    expect(updateTask(tasks, 'nope', input)).toEqual(tasks);
  });
});

describe('deleteTask', () => {
  it('removes the task without changing the input', () => {
    const tasks = frozenTasks();
    const before = snapshot(tasks);
    expect(deleteTask(tasks, 'b').map((task) => task.id)).toEqual(['a', 'c']);
    expect(snapshot(tasks)).toBe(before);
  });

  it('does nothing for an unknown id', () => {
    expect(deleteTask(frozenTasks(), 'nope')).toHaveLength(3);
  });
});

describe('restoreTask', () => {
  const deleted = makeTask({ id: 'd', title: 'Deleted' });

  it('puts the task back at the same index', () => {
    const tasks = frozenTasks();
    const before = snapshot(tasks);
    expect(restoreTask(tasks, deleted, 1).map((task) => task.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(restoreTask(tasks, deleted, 0).map((task) => task.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(snapshot(tasks)).toBe(before);
  });

  it('puts it at the end when that index no longer exists', () => {
    expect(restoreTask(frozenTasks(), deleted, 10).map((task) => task.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(restoreTask([], deleted, 3).map((task) => task.id)).toEqual(['d']);
  });

  it('never adds the same id twice', () => {
    const tasks = frozenTasks();
    expect(restoreTask(tasks, makeTask({ id: 'a' }), 0)).toHaveLength(3);
  });
});

describe('toggleDone', () => {
  it('flips done on one task only, with a new object', () => {
    const tasks = frozenTasks();
    const before = snapshot(tasks);
    const result = toggleDone(tasks, 'a');
    expect(result.map((task) => task.done)).toEqual([true, true, false]);
    expect(result[0]).not.toBe(tasks[0]);
    expect(result[2]).toBe(tasks[2]);
    expect(toggleDone(result, 'a')[0]?.done).toBe(false);
    expect(snapshot(tasks)).toBe(before);
  });
});

describe('isValidDueDate', () => {
  it('accepts only a real YYYY-MM-DD date with a 4-digit year', () => {
    expect(isValidDueDate('2026-11-12')).toBe(true);
    expect(isValidDueDate('2028-02-29')).toBe(true);
    for (const bad of [
      '2026-02-30',
      '2026-02-29',
      '2026-13-01',
      '2026-11-00',
      '20266-11-12',
      '0999-01-01',
      '0000-01-01',
      '26-11-12',
      '2026-1-5',
      '12/11/2026',
      'tomorrow',
    ]) {
      expect(isValidDueDate(bad), bad).toBe(false);
    }
  });
});

describe('validateTask', () => {
  const tasks = [
    makeTask({ id: 'a', title: 'Buy milk' }),
    makeTask({ id: 'b', title: 'Call Ali' }),
  ];
  const context = { tasks, today: FAKE_TODAY };

  function check(values: Partial<TaskFormValues>, editingId?: string) {
    return validateTask(
      { ...EMPTY_FORM_VALUES, title: 'Something', ...values },
      {
        ...context,
        editingId,
      },
    );
  }

  it('accepts a normal task with no errors or warnings', () => {
    expect(check({ title: 'Write report', dueDate: '2026-11-20' })).toEqual({
      errors: {},
      warnings: {},
      isValid: true,
    });
  });

  it('requires a title, also when it is only spaces', () => {
    expect(check({ title: '' }).errors.title).toBe(MESSAGES.titleRequired);
    expect(check({ title: '   \t ' }).errors.title).toBe(MESSAGES.titleRequired);
    expect(check({ title: '   ' }).isValid).toBe(false);
  });

  it('allows 100 title characters and blocks 101 (counted after trimming, emoji = 1)', () => {
    expect(check({ title: 'a'.repeat(100) }).isValid).toBe(true);
    expect(check({ title: `  ${'a'.repeat(100)}  ` }).isValid).toBe(true);
    expect(check({ title: '🛒'.repeat(100) }).isValid).toBe(true);
    expect(check({ title: 'a'.repeat(101) }).errors.title).toBe(MESSAGES.titleTooLong);
  });

  it('allows 500 description characters and blocks 501', () => {
    expect(check({ description: '🛒'.repeat(500) }).isValid).toBe(true);
    expect(check({ description: 'a'.repeat(501) }).errors.description).toBe(
      MESSAGES.descriptionTooLong,
    );
  });

  it('accepts an empty due date and rejects an invalid one', () => {
    expect(check({ dueDate: '' }).isValid).toBe(true);
    expect(check({ dueDate: '2026-02-30' }).errors.dueDate).toBe(MESSAGES.invalidDate);
    expect(check({ dueDate: '20266-01-01' }).errors.dueDate).toBe(MESSAGES.invalidDate);
  });

  it('warns about a past date but still allows it', () => {
    const result = check({ dueDate: '2026-11-09' });
    expect(result.warnings.dueDate).toBe(MESSAGES.pastDate);
    expect(result.isValid).toBe(true);
    expect(check({ dueDate: FAKE_TODAY }).warnings.dueDate).toBeUndefined();
  });

  it('warns about a duplicate title (trimmed, any case) but still allows it', () => {
    const result = check({ title: '  BUY MILK ' });
    expect(result.warnings.title).toBe(MESSAGES.duplicateTitle);
    expect(result.isValid).toBe(true);
  });

  it('does not call the task being edited a duplicate of itself', () => {
    expect(check({ title: 'Buy milk' }, 'a').warnings.title).toBeUndefined();
    expect(check({ title: 'Call Ali' }, 'a').warnings.title).toBe(MESSAGES.duplicateTitle);
  });
});

describe('helpers for saving to the server', () => {
  const task = makeTask({
    id: 'a',
    title: 'Old',
    description: 'D',
    priority: 'low',
    dueDate: null,
  });

  it('getChangedFields returns only what changed (nothing → {})', () => {
    const same = { title: 'Old', description: 'D', priority: task.priority, dueDate: null };
    expect(getChangedFields(task, same)).toEqual({});
    expect(getChangedFields(task, { ...same, title: 'New', dueDate: '2026-11-20' })).toEqual({
      title: 'New',
      dueDate: '2026-11-20',
    });
    // Clearing a date is a change too (null is sent, not left out).
    expect(
      getChangedFields({ ...task, dueDate: '2026-11-20' }, { ...same, dueDate: null }),
    ).toEqual({ dueDate: null });
  });

  it('setDone sets an exact value and never changes the input array', () => {
    const tasks = [task, makeTask({ id: 'b' })];
    const result = setDone(tasks, 'a', true);
    expect(result[0]?.done).toBe(true);
    expect(setDone(result, 'a', true)[0]?.done).toBe(true); // not a flip
    expect(tasks[0]?.done).toBe(false);
  });

  it('replaceTask swaps in the server version by id', () => {
    const saved = { ...task, title: 'From server' };
    expect(replaceTask([task, makeTask({ id: 'b' })], saved).map((t) => t.title)).toEqual([
      'From server',
      'Task b',
    ]);
  });
});
