import type { Priority, Task } from '../types';
import { pluralize } from './plural';

/**
 * Not-done tasks first, then by due date (earliest first, no date last),
 * then by title. The id is a last tie-breaker so the order is always stable.
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;

  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    // "YYYY-MM-DD" strings sort correctly as plain text.
    return a.dueDate < b.dueDate ? -1 : 1;
  }

  const byTitle = a.title.localeCompare(b.title);
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id);
}

/** Returns a new sorted array; the input is not changed. */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return tasks.toSorted(compareTasks);
}

/** The list the user sees: optionally without done tasks, always sorted. */
export function getVisibleTasks(tasks: readonly Task[], hideDone: boolean): Task[] {
  const filtered = hideDone ? tasks.filter((task) => !task.done) : tasks;
  return sortTasks(filtered);
}

export function countDone(tasks: readonly Task[]): number {
  return tasks.filter((task) => task.done).length;
}

/** "3 of 7 done", or "No tasks yet" when the list is empty. */
export function getSummaryText(tasks: readonly Task[]): string {
  if (tasks.length === 0) return 'No tasks yet';
  return `${countDone(tasks)} of ${tasks.length} done`;
}

/**
 * The line above the list. It is a live region, so screen readers
 * hear the change when the filter hides or shows tasks.
 */
export function getListStatusText(totalCount: number, visibleCount: number): string {
  if (totalCount === 0) return 'No tasks yet. Add your first task below.';
  if (visibleCount === 0) {
    return totalCount === 1
      ? 'Your only task is done, so it is hidden.'
      : `All ${totalCount} tasks are done, so they are all hidden.`;
  }
  return `Showing ${pluralize(visibleCount, 'task')}`;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
