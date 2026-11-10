import type { Task } from '../types';

/** Builds a task for tests. Pass only the fields the test cares about. */
export function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: `Task ${overrides.id}`,
    description: 'Some description',
    done: false,
    priority: 'medium',
    dueDate: null,
    ...overrides,
  };
}

/** A fixed fake "today" so no test depends on the real date. */
export const FAKE_TODAY = '2026-11-10';
