import type { TaskFormValues } from '../types';

/**
 * A half-typed task form is kept in sessionStorage, so it survives a forced log-out
 * (expired token) and comes back after logging in again. An explicit log-out clears them.
 * Every call is wrapped: storage can be blocked, and then there is simply no draft.
 */
const PREFIX = 'task-tracker:draft:';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const ADD_DRAFT_KEY = 'add';
export const editDraftKey = (taskId: string) => `edit:${taskId}`;

export function readDraft(key: string): TaskFormValues | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;
    const { title, description, priority, dueDate } = data;
    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      typeof dueDate !== 'string' ||
      (priority !== 'low' && priority !== 'medium' && priority !== 'high')
    ) {
      return null;
    }
    return { title, description, priority, dueDate };
  } catch {
    return null;
  }
}

export function writeDraft(key: string, values: TaskFormValues) {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(values));
  } catch {
    // No draft saving; the form still works.
  }
}

export function removeDraft(key: string) {
  try {
    window.sessionStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to remove.
  }
}

export function clearAllDrafts() {
  try {
    const store = window.sessionStorage;
    for (const key of Object.keys(store)) {
      if (key.startsWith(PREFIX)) store.removeItem(key);
    }
  } catch {
    // Nothing to clear.
  }
}
