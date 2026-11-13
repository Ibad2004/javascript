import { useEffect, useRef, useState } from 'react';
import {
  createTask,
  deleteTask as deleteTaskOnServer,
  getTasks,
  isNotFound,
  toUserMessage,
  updateTask as updateTaskOnServer,
} from '../api/tasks';
import type { Announcement } from '../components/LiveRegion';
import type { Task, TaskInput } from '../types';
import { focusIds } from '../utils/focusIds';
import {
  deleteTask,
  getChangedFields,
  makeId as defaultMakeId,
  replaceTask,
  restoreTask,
  setDone,
} from '../utils/tasks';

/** The last deleted task and where it was, so Undo can put it back in the same place. */
export type DeletedTask = { task: Task; index: number };

/** The first load. Only "ready" shows the tasks. */
export type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

/** Called when the server says the task is gone (deleted in another tab). */
type OnMissing = { onMissing?: () => void };

/**
 * The list page's filters. true = this task (as it is AFTER the change) is hidden by them:
 * the message then says so ("…, but hidden by your filters.") and offers "Show all".
 */
export type HiddenBy = { hiddenBy?: (task: Task) => boolean };

export type ToggleDoneOptions = OnMissing &
  HiddenBy & {
    /** If the task leaves the filtered list, focus moves here (its neighbour, or the heading). */
    hiddenFocusId?: string;
  };

/** "Task added, but hidden by your filters." — shown with a [Show all] button. */
export type FilterNotice = { text: string; taskId: string };

export const HIDDEN_SUFFIX = ', but hidden by your filters.';

export type DeleteOptions = OnMissing & {
  /** Where focus goes once the task is gone (the Delete button that had it disappears). */
  focusId?: string;
};

type UseTasksOptions = {
  /** Makes the id of a new task. Tests pass a fake one to get predictable ids. */
  makeId?: () => string;
};

/**
 * All the task data and every server request: the first load (with retry), add, edit,
 * done, delete and undo, the one-request-per-task guard, the error notice and the
 * live-region messages. Pages only decide what to show and where focus goes.
 */
export function useTasks({ makeId = defaultMakeId }: UseTasksOptions = {}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  // "Try again" adds 1: the load effect depends on it, so it runs again.
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Items in db.json that failed the type guard. Shown once, after the load.
  const [skippedCount, setSkippedCount] = useState(0);
  // Only the latest delete can be undone, so one slot is enough.
  const [lastDeleted, setLastDeleted] = useState<DeletedTask | null>(null);
  // Tasks with a request running. The ref answers at once (a double click comes before the
  // re-render); the state copy re-renders the rows so their controls look disabled.
  const busyRef = useRef(new Set<string>());
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  // The last failed save, shown at the top of the page until dismissed or the next action.
  const [notice, setNotice] = useState<string | null>(null);
  // A task the user just changed is hidden by the list's filters. Cleared like `notice`.
  const [filterNotice, setFilterNotice] = useState<FilterNotice | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement>({ text: '', id: 0 });
  // A new object every time, so asking twice for the same element still re-renders and focuses.
  const [focusRequest, setFocusRequest] = useState<{ elementId: string } | null>(null);

  // Focus can only move to an element after React has put it on the page,
  // so the handlers ask for it and this effect does it after the render.
  useEffect(() => {
    if (focusRequest === null) return;
    const target =
      document.getElementById(focusRequest.elementId) ??
      document.getElementById(focusIds.pageHeading);
    target?.focus();
  }, [focusRequest]);

  function retryLoad() {
    setLoadState({ status: 'loading' });
    setLoadAttempt((n) => n + 1);
  }

  function requestFocus(elementId: string) {
    setFocusRequest({ elementId });
  }

  /** Screen readers read this out. A new id makes the same text ("Task added" twice) be read again. */
  function announce(text: string) {
    setAnnouncement((old) => ({ text, id: old.id + 1 }));
  }

  /** A failed save: shown on the page AND read out by the live region. */
  function showError(text: string) {
    setNotice(text);
    announce(text);
  }

  // Loading is a real effect: it keeps the page in sync with the server when the app
  // appears (and on "Try again"). Clicks never use effects: saving lives in the handlers.
  useEffect(() => {
    const controller = new AbortController();
    getTasks(controller.signal).then(
      (result) => {
        // After unmount (or StrictMode's dev re-run) the old request's answer is ignored.
        if (controller.signal.aborted) return;
        setTasks(result.tasks);
        setSkippedCount(result.skipped);
        setLoadState({ status: 'ready' });
      },
      (error: unknown) => {
        // Our own abort (AbortError) is not a failure: say nothing.
        if (controller.signal.aborted) return;
        const message = toUserMessage(error);
        setLoadState({ status: 'error', message });
        announce(`Couldn't load the tasks. ${message}`);
      },
    );
    return () => controller.abort();
  }, [loadAttempt]);

  function dismissNotice() {
    setNotice(null);
  }

  function dismissFilterNotice() {
    setFilterNotice(null);
  }

  /** Every new action starts with a clean slate: old messages would be about something else. */
  function clearMessages() {
    setNotice(null);
    setFilterNotice(null);
  }

  /**
   * Announces `text`. If the filters hide the task, the message says so on the page too,
   * so the user is never left wondering where the task went.
   */
  function announceResult(text: string, task: Task, hiddenBy?: (task: Task) => boolean) {
    if (hiddenBy?.(task) === true) {
      const message = `${text}${HIDDEN_SUFFIX}`;
      setFilterNotice({ text: message, taskId: task.id });
      announce(message);
    } else {
      announce(text);
    }
  }

  function clearLastDeleted() {
    setLastDeleted(null);
  }

  /** Marks a task busy. false = a request for it is already running, so do nothing. */
  function lockTask(id: string): boolean {
    if (busyRef.current.has(id)) return false;
    busyRef.current.add(id);
    setBusyIds(new Set(busyRef.current));
    return true;
  }

  function unlockTask(id: string) {
    busyRef.current.delete(id);
    setBusyIds(new Set(busyRef.current));
  }

  function isBusy(id: string): boolean {
    return busyRef.current.has(id);
  }

  /** The server says the task is gone (deleted in another tab): drop it here too and say why. */
  function removeMissingTask(id: string, onMissing?: () => void) {
    setTasks((old) => deleteTask(old, id));
    setLastDeleted((current) => (current?.task.id === id ? null : current));
    showError('This task no longer exists. It was removed from the list.');
    requestFocus(focusIds.pageHeading);
    // Same synchronous batch as the updates above: the page leaves before it re-renders.
    onMissing?.();
  }

  /** Waits for the server. Returns an error message for the form, or null when saved. */
  async function addTask(input: TaskInput, { hiddenBy }: HiddenBy = {}): Promise<string | null> {
    clearMessages();
    // The id is made here, in the event handler: the same id is used by the server and by Undo.
    const newTask: Task = { id: makeId(), ...input, done: false };
    try {
      const saved = await createTask(newTask);
      setTasks((old) => [...old, saved]);
      announceResult('Task added', saved, hiddenBy);
      return null;
    } catch (error) {
      const message = `Couldn't add the task. ${toUserMessage(error)}`;
      announce(message);
      return message;
    }
  }

  /**
   * Sends ONLY the changed fields. Returns an error message for the form,
   * or null when saved (or nothing changed, or the task is gone: then onMissing runs).
   */
  async function saveTask(
    id: string,
    input: TaskInput,
    { onMissing }: OnMissing = {},
  ): Promise<string | null> {
    const task = tasks.find((t) => t.id === id);
    if (task === undefined) return null;
    const changes = getChangedFields(task, input);

    if (Object.keys(changes).length > 0) {
      if (!lockTask(id)) return 'This task is still saving. Try again in a moment.';
      clearMessages();
      try {
        // PATCH, not PUT: the server merges these fields into ITS current task, so a
        // "done" ticked while the form was open stays done (no lost update).
        const saved = await updateTaskOnServer(id, changes);
        setTasks((old) => replaceTask(old, saved));
      } catch (error) {
        if (isNotFound(error)) {
          removeMissingTask(id, onMissing);
          return null;
        }
        const message = `Couldn't save the changes. ${toUserMessage(error)}`;
        announce(message);
        return message;
      } finally {
        unlockTask(id);
      }
    }

    announce('Changes saved');
    return null;
  }

  /** Optimistic: the task disappears at once; if the server says no, it comes back. */
  async function removeTask(id: string, { focusId, onMissing }: DeleteOptions = {}) {
    const index = tasks.findIndex((task) => task.id === id);
    const task = tasks[index];
    if (task === undefined || !lockTask(id)) return;

    clearMessages();
    setTasks((old) => deleteTask(old, id));
    setLastDeleted({ task, index });
    announce('Task deleted');
    requestFocus(focusId ?? focusIds.pageHeading);

    try {
      await deleteTaskOnServer(id);
    } catch (error) {
      if (isNotFound(error)) {
        removeMissingTask(id, onMissing);
      } else {
        setTasks((old) => restoreTask(old, task, index));
        setLastDeleted((current) => (current?.task.id === id ? null : current));
        showError(`Couldn't delete. The task is back. ${toUserMessage(error)}`);
      }
    } finally {
      unlockTask(id);
    }
  }

  /** Undo = create the task again on the server, with the SAME id. */
  async function undoDelete({ hiddenBy }: HiddenBy = {}) {
    if (lastDeleted === null) return;
    const { task, index } = lastDeleted;
    // While the DELETE is still running, Undo waits (the button shows as disabled).
    if (!lockTask(task.id)) return;
    clearMessages();
    setTasks((old) => restoreTask(old, task, index));
    setLastDeleted(null);
    announceResult('Task restored', task, hiddenBy);
    // If the filters hide it, the effect falls back to the page heading.
    requestFocus(focusIds.link(task.id));

    try {
      const saved = await createTask(task);
      setTasks((old) => replaceTask(old, saved));
    } catch (error) {
      setTasks((old) => deleteTask(old, task.id));
      // The Undo bar comes back, so the user can try again.
      setLastDeleted({ task, index });
      setFilterNotice(null);
      showError(`Couldn't restore the task. ${toUserMessage(error)}`);
      requestFocus(focusIds.pageHeading);
    } finally {
      unlockTask(task.id);
    }
  }

  /** Optimistic: the tick shows at once; if the server says no, it goes back. */
  async function toggleDone(
    id: string,
    { hiddenBy, hiddenFocusId, onMissing }: ToggleDoneOptions = {},
  ) {
    const task = tasks.find((t) => t.id === id);
    if (task === undefined || !lockTask(id)) return;
    const nowDone = !task.done;
    const changed: Task = { ...task, done: nowDone };

    clearMessages();
    setTasks((old) => setDone(old, id, nowDone));
    announceResult(nowDone ? 'Task marked done' : 'Task marked not done', changed, hiddenBy);
    // The checkbox that had focus disappears with its row.
    if (hiddenBy?.(changed) === true && hiddenFocusId !== undefined) requestFocus(hiddenFocusId);

    try {
      const saved = await updateTaskOnServer(id, { done: nowDone });
      setTasks((old) => replaceTask(old, saved));
    } catch (error) {
      if (isNotFound(error)) {
        removeMissingTask(id, onMissing);
      } else {
        setTasks((old) => setDone(old, id, task.done));
        setFilterNotice(null);
        showError(`Couldn't save the change. The task is back as it was. ${toUserMessage(error)}`);
      }
    } finally {
      unlockTask(id);
    }
  }

  return {
    loadState,
    retryLoad,
    tasks,
    skippedCount,
    busyIds,
    isBusy,
    notice,
    dismissNotice,
    filterNotice,
    dismissFilterNotice,
    announcement,
    announce,
    requestFocus,
    lastDeleted,
    clearLastDeleted,
    addTask,
    saveTask,
    removeTask,
    undoDelete,
    toggleDone,
  };
}

export type TasksApi = ReturnType<typeof useTasks>;
