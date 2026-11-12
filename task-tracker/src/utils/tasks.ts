import type { Priority, Task, TaskFormValues, TaskInput } from '../types';
import { parseDateOnly } from './dates';
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

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

export const EMPTY_FORM_VALUES: TaskFormValues = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
};

/**
 * Counts what the user sees as characters. "🛒".length is 2 (two UTF-16 units),
 * but [..."🛒"].length is 1, so an emoji counts as one character.
 */
export function countChars(text: string): number {
  return [...text].length;
}

/**
 * A new unique id. crypto.randomUUID() only exists in a "secure context"
 * (https or localhost). Opening the dev server from a phone on the local
 * network (http://192.168...) is not one, so there is a simple fallback.
 */
export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Trimmed values, ready to store. An empty due date becomes null. */
export function toTaskInput(values: TaskFormValues): TaskInput {
  const dueDate = values.dueDate.trim();
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    priority: values.priority,
    dueDate: dueDate === '' ? null : dueDate,
  };
}

/** The other way round: a stored task as form values (for the edit form). */
export function toFormValues(task: TaskInput): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
  };
}

/** Returns a NEW array with the new task at the end. The input array is not changed. */
export function addTask(tasks: readonly Task[], input: TaskInput, id: string): Task[] {
  return [...tasks, { id, ...input, done: false }];
}

/**
 * Changes ONLY the four edited fields of the task with this id, on the task as it
 * is NOW in the array. Other fields (like `done`) are kept, so ticking a task done
 * while its edit form is open is not undone by Save (no "lost update").
 */
export function updateTask(tasks: readonly Task[], id: string, input: TaskInput): Task[] {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
        }
      : task,
  );
}

/** Returns a new array without the task. */
export function deleteTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

/**
 * Puts a deleted task back at its old index (for Undo).
 * If the list is now shorter than that index, it goes at the end.
 */
export function restoreTask(tasks: readonly Task[], task: Task, index: number): Task[] {
  if (tasks.some((t) => t.id === task.id)) return [...tasks];
  const position = Math.min(Math.max(index, 0), tasks.length);
  return tasks.toSpliced(position, 0, task);
}

/** Flips `done` on one task. The old task object is not changed: a new one is made. */
export function toggleDone(tasks: readonly Task[], id: string): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
}

/** Sets `done` to an exact value (not a flip), so a rollback can never flip the wrong way. */
export function setDone(tasks: readonly Task[], id: string, done: boolean): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, done } : task));
}

/** Puts the server's version of a task in place of ours (same id). */
export function replaceTask(tasks: readonly Task[], saved: Task): Task[] {
  return tasks.map((task) => (task.id === saved.id ? saved : task));
}

/**
 * Only the fields the user really changed, for a PATCH. Sending the whole old object
 * would overwrite a change made in the meantime (e.g. "done" ticked in another tab).
 */
export function getChangedFields(task: Task, input: TaskInput): Partial<TaskInput> {
  const changes: Partial<TaskInput> = {};
  if (input.title !== task.title) changes.title = input.title;
  if (input.description !== task.description) changes.description = input.description;
  if (input.priority !== task.priority) changes.priority = input.priority;
  if (input.dueDate !== task.dueDate) changes.dueDate = input.dueDate;
  return changes;
}

export const MESSAGES = {
  titleRequired: 'Title is required',
  titleTooLong: `Title must be ${TITLE_MAX} characters or less`,
  descriptionTooLong: `Description must be ${DESCRIPTION_MAX} characters or less`,
  invalidDate: 'Enter a valid date',
  pastDate: 'This date is in the past',
  duplicateTitle: 'A task with this title already exists',
} as const;

type FieldMessages<K extends string> = Partial<Record<K, string>>;

export type TaskValidation = {
  /** Errors block saving. */
  errors: FieldMessages<'title' | 'description' | 'dueDate'>;
  /** Warnings are shown, but saving is still allowed. */
  warnings: FieldMessages<'title' | 'dueDate'>;
  isValid: boolean;
};

/** A real "YYYY-MM-DD" date with a 4-digit year (1000 to 9999) and a real day. */
export function isValidDueDate(value: string): boolean {
  const parts = parseDateOnly(value);
  return parts !== null && parts.year >= 1000;
}

/**
 * Checks the TRIMMED values.
 * `tasks` and `editingId` are used for the duplicate-title warning
 * (the task being edited is not a duplicate of itself).
 */
export function validateTask(
  values: TaskFormValues,
  context: { tasks: readonly Task[]; today: string; editingId?: string | null },
): TaskValidation {
  const input = toTaskInput(values);
  const errors: TaskValidation['errors'] = {};
  const warnings: TaskValidation['warnings'] = {};

  if (input.title === '') errors.title = MESSAGES.titleRequired;
  else if (countChars(input.title) > TITLE_MAX) errors.title = MESSAGES.titleTooLong;

  if (countChars(input.description) > DESCRIPTION_MAX) {
    errors.description = MESSAGES.descriptionTooLong;
  }

  if (input.dueDate !== null) {
    if (!isValidDueDate(input.dueDate)) errors.dueDate = MESSAGES.invalidDate;
    // Both are "YYYY-MM-DD", so plain text comparison works.
    else if (input.dueDate < context.today) warnings.dueDate = MESSAGES.pastDate;
  }

  if (input.title !== '') {
    const wanted = input.title.toLowerCase();
    const isDuplicate = context.tasks.some(
      (task) => task.id !== context.editingId && task.title.trim().toLowerCase() === wanted,
    );
    if (isDuplicate) warnings.title = MESSAGES.duplicateTitle;
  }

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
}
