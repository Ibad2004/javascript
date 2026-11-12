import { useEffect, useRef, useState } from 'react';
import {
  createTask,
  deleteTask as deleteTaskOnServer,
  getTasks,
  isNotFound,
  toUserMessage,
  updateTask as updateTaskOnServer,
} from './api/tasks';
import { Header } from './components/Header';
import { HiddenTasksNote } from './components/HiddenTasksNote';
import { LiveRegion, type Announcement } from './components/LiveRegion';
import { TaskDetail } from './components/TaskDetail';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskSummary } from './components/TaskSummary';
import { UndoBar } from './components/UndoBar';
import { UnsavedChangesBar } from './components/UnsavedChangesBar';
import type { Task, TaskInput } from './types';
import { focusIds } from './utils/focusIds';
import { pluralize } from './utils/plural';
import { scrollIntoViewOnNarrowScreen } from './utils/scroll';
import {
  countDone,
  deleteTask,
  getChangedFields,
  getListStatusText,
  getVisibleTasks,
  makeId as defaultMakeId,
  replaceTask,
  restoreTask,
  setDone,
  toFormValues,
} from './utils/tasks';

type AppProps = {
  /** The user's local date, "YYYY-MM-DD". main.tsx passes the real one; tests pass a fake one. */
  today: string;
  /** Makes the id of a new task. Tests pass a fake one to get predictable ids. */
  makeId?: () => string;
};

/** What the user tried to do while the edit form had unsaved changes. */
type PendingAction = { kind: 'select' | 'edit'; id: string };

/** The last deleted task and where it was, so Undo can put it back in the same place. */
type DeletedTask = { task: Task; index: number };

/** The first load. Only "ready" shows the list and the add form. */
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

export function App({ today, makeId = defaultMakeId }: AppProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  // "Try again" adds 1: the load effect depends on it, so it runs again.
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Items in db.json that failed the type guard. Shown once, after the load.
  const [skippedCount, setSkippedCount] = useState(0);
  const [hideDone, setHideDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Only one task can be edited at a time, so one id is enough.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIsDirty, setEditIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Only the latest delete can be undone, so one slot is enough.
  const [lastDeleted, setLastDeleted] = useState<DeletedTask | null>(null);
  // Tasks with a request running. The ref answers at once (a double click comes before the
  // re-render); the state copy re-renders the rows so their controls look disabled.
  const busyRef = useRef(new Set<string>());
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  // The last failed save, shown above the list until dismissed or the next action.
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement>({ text: '', id: 0 });
  // A new object every time, so asking twice for the same element still re-renders and focuses.
  const [focusRequest, setFocusRequest] = useState<{ elementId: string } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  // Everything below is derived on every render; nothing is stored twice (no effect needed).
  const visibleTasks = getVisibleTasks(tasks, hideDone);
  // Looked up in the VISIBLE list: if the filter hides the selected task,
  // this becomes null and the detail panel shows its empty message.
  const selectedTask = visibleTasks.find((task) => task.id === selectedId) ?? null;
  // Looked up in ALL tasks: ticking the edited task done while done tasks are hidden
  // must not throw away what the user typed in the edit form.
  const editingTask = tasks.find((task) => task.id === editingId) ?? null;
  const hiddenCount = hideDone ? countDone(tasks) : 0;

  // Focus can only move to an element after React has put it on the page,
  // so the handlers ask for it and this effect does it after the render.
  useEffect(() => {
    if (focusRequest === null) return;
    const target =
      document.getElementById(focusRequest.elementId) ??
      document.getElementById(focusIds.listHeading);
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

  // Loading is a real effect: it keeps the page in sync with the server when the page
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

  function selectTask(id: string) {
    const isDeselect = id === selectedId;
    setSelectedId((current) => (current === id ? null : id));
    if (!isDeselect) scrollIntoViewOnNarrowScreen(detailRef.current);
  }

  function startEditing(id: string) {
    setSelectedId(id);
    setEditingId(id);
    setEditIsDirty(false);
    setPendingAction(null);
    scrollIntoViewOnNarrowScreen(detailRef.current);
  }

  function stopEditing() {
    setEditingId(null);
    setEditIsDirty(false);
    setPendingAction(null);
  }

  function runAction(action: PendingAction) {
    if (action.kind === 'edit') {
      startEditing(action.id);
    } else {
      selectTask(action.id);
      requestFocus(focusIds.select(action.id));
    }
  }

  /**
   * Selecting a task or clicking "Edit" while another edit is open.
   * With unsaved changes we ask first (inline bar, no window.confirm);
   * without changes the old edit simply closes.
   */
  function guardedAction(action: PendingAction) {
    if (action.kind === 'edit' && busyRef.current.has(action.id)) return;
    if (editingId !== null) {
      if (action.kind === 'edit' && action.id === editingId) return; // already editing it
      if (editIsDirty) {
        setPendingAction(action);
        announce('You have unsaved changes');
        requestFocus(focusIds.unsavedBar);
        return;
      }
      stopEditing();
    }
    if (action.kind === 'edit') startEditing(action.id);
    else selectTask(action.id);
  }

  /**
   * The server says the task is gone (deleted in another tab): drop it here too,
   * close its detail and edit form, and say why.
   */
  function removeMissingTask(id: string) {
    setTasks((old) => deleteTask(old, id));
    setSelectedId((current) => (current === id ? null : current));
    setLastDeleted((current) => (current?.task.id === id ? null : current));
    if (editingId === id) stopEditing();
    showError('This task no longer exists. It was removed from the list.');
    requestFocus(focusIds.listHeading);
  }

  /** Waits for the server. Returns an error message for the form, or null when saved. */
  async function handleAdd(input: TaskInput): Promise<string | null> {
    setNotice(null);
    // The id is made here, in the event handler: the same id is used by the server and by Undo.
    const newTask: Task = { id: makeId(), ...input, done: false };
    try {
      const saved = await createTask(newTask);
      setTasks((old) => [...old, saved]);
      announce('Task added');
      return null;
    } catch (error) {
      const message = `Couldn't add the task. ${toUserMessage(error)}`;
      announce(message);
      return message;
    }
  }

  /** Waits for the server, then closes the form. Sends ONLY the changed fields. */
  async function handleSaveEdit(input: TaskInput): Promise<string | null> {
    if (editingId === null) return null;
    const id = editingId;
    const task = tasks.find((t) => t.id === id);
    if (task === undefined) return null;
    const action = pendingAction;
    const changes = getChangedFields(task, input);

    if (Object.keys(changes).length > 0) {
      if (!lockTask(id)) return 'This task is still saving. Try again in a moment.';
      setNotice(null);
      try {
        // PATCH, not PUT: the server merges these fields into ITS current task, so a
        // "done" ticked while the form was open stays done (no lost update).
        const saved = await updateTaskOnServer(id, changes);
        setTasks((old) => replaceTask(old, saved));
      } catch (error) {
        if (isNotFound(error)) {
          removeMissingTask(id);
          return null;
        }
        const message = `Couldn't save the changes. ${toUserMessage(error)}`;
        announce(message);
        return message;
      } finally {
        unlockTask(id);
      }
    }

    stopEditing();
    announce('Changes saved');
    if (action !== null) runAction(action);
    else requestFocus(focusIds.select(id));
    return null;
  }

  function handleCancelEdit() {
    if (editingId === null) return;
    const id = editingId;
    stopEditing();
    requestFocus(focusIds.edit(id));
  }

  function handleDiscard() {
    const action = pendingAction;
    stopEditing();
    if (action !== null) runAction(action);
  }

  /** The task to focus when `id` leaves the visible list: the next one, else the previous one. */
  function neighbourOf(id: string): Task | null {
    const index = visibleTasks.findIndex((task) => task.id === id);
    return visibleTasks[index + 1] ?? visibleTasks[index - 1] ?? null;
  }

  /** Optimistic: the task disappears at once; if the server says no, it comes back. */
  async function handleDelete(id: string) {
    const index = tasks.findIndex((task) => task.id === id);
    const task = tasks[index];
    if (task === undefined || !lockTask(id)) return;
    const neighbour = neighbourOf(id);

    setNotice(null);
    setTasks((old) => deleteTask(old, id));
    setLastDeleted({ task, index });
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) stopEditing();
    announce('Task deleted');
    // Focus must not be lost (it was on the Delete button, which is now gone).
    requestFocus(neighbour !== null ? focusIds.select(neighbour.id) : focusIds.listHeading);

    try {
      await deleteTaskOnServer(id);
    } catch (error) {
      if (isNotFound(error)) {
        removeMissingTask(id);
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
  async function handleUndo() {
    if (lastDeleted === null) return;
    const { task, index } = lastDeleted;
    // While the DELETE is still running, Undo waits (the button shows as disabled).
    if (!lockTask(task.id)) return;
    setNotice(null);
    setTasks((old) => restoreTask(old, task, index));
    setLastDeleted(null);
    announce('Task restored');
    // If "Hide done tasks" hides it, the effect falls back to the list heading.
    requestFocus(focusIds.select(task.id));

    try {
      const saved = await createTask(task);
      setTasks((old) => replaceTask(old, saved));
    } catch (error) {
      setTasks((old) => deleteTask(old, task.id));
      // The Undo bar comes back, so the user can try again.
      setLastDeleted({ task, index });
      showError(`Couldn't restore the task. ${toUserMessage(error)}`);
      requestFocus(focusIds.listHeading);
    } finally {
      unlockTask(task.id);
    }
  }

  /** Optimistic: the tick shows at once; if the server says no, it goes back. */
  async function handleToggleDone(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (task === undefined || !lockTask(id)) return;
    const nowDone = !task.done;
    const willHide = nowDone && hideDone;
    // Read before the update: once hidden, the task is no longer in visibleTasks.
    const neighbour = willHide ? neighbourOf(id) : null;

    setNotice(null);
    setTasks((old) => setDone(old, id, nowDone));
    if (willHide) {
      announce('Task marked done (hidden)');
      // The checkbox that had focus disappears with its row.
      requestFocus(neighbour !== null ? focusIds.select(neighbour.id) : focusIds.listHeading);
    } else {
      announce(nowDone ? 'Task marked done' : 'Task marked not done');
    }

    try {
      const saved = await updateTaskOnServer(id, { done: nowDone });
      setTasks((old) => replaceTask(old, saved));
    } catch (error) {
      if (isNotFound(error)) {
        removeMissingTask(id);
      } else {
        setTasks((old) => setDone(old, id, task.done));
        showError(`Couldn't save the change. The task is back as it was. ${toUserMessage(error)}`);
      }
    } finally {
      unlockTask(id);
    }
  }

  function toggleHideDone() {
    setHideDone((h) => !h);
  }

  const isReady = loadState.status === 'ready';

  return (
    <div className="app">
      <Header />
      <main className="layout">
        <section
          className="panel"
          aria-labelledby="tasks-heading"
          aria-busy={loadState.status === 'loading'}
        >
          {/* tabIndex -1: focus can land here after the last task is deleted. */}
          <h2 id="tasks-heading" tabIndex={-1}>
            Tasks
          </h2>
          {loadState.status === 'loading' && <p className="load-status">Loading tasks…</p>}
          {loadState.status === 'error' && (
            <div className="load-error">
              <p>{loadState.message}</p>
              <button type="button" onClick={retryLoad}>
                Try again
              </button>
            </div>
          )}
          {isReady && (
            <>
              <TaskSummary tasks={tasks} />
              {skippedCount > 0 && (
                <p className="data-warning">
                  {pluralize(skippedCount, 'item')} in the saved data could not be read and{' '}
                  {skippedCount === 1 ? 'was' : 'were'} skipped.
                </p>
              )}
              {notice !== null && (
                <div className="notice">
                  <p>{notice}</p>
                  <button type="button" onClick={() => setNotice(null)}>
                    Dismiss
                  </button>
                </div>
              )}
              <button
                type="button"
                className="toggle-button"
                aria-pressed={hideDone}
                onClick={toggleHideDone}
              >
                {hideDone ? 'Show done tasks' : 'Hide done tasks'}
              </button>
              <p role="status" className="list-status">
                {getListStatusText(tasks.length, visibleTasks.length)}
              </p>
              {lastDeleted !== null && (
                <UndoBar
                  key={lastDeleted.task.id}
                  message="Task deleted."
                  onUndo={handleUndo}
                  onTimeout={() => setLastDeleted(null)}
                  busy={busyIds.has(lastDeleted.task.id)}
                />
              )}
              {hiddenCount > 0 && (
                <HiddenTasksNote hiddenCount={hiddenCount} onShow={toggleHideDone} />
              )}
              {visibleTasks.length > 0 && (
                <TaskList
                  tasks={visibleTasks}
                  selectedId={selectedId}
                  editingId={editingId}
                  busyIds={busyIds}
                  onSelect={(id) => guardedAction({ kind: 'select', id })}
                  onEdit={(id) => guardedAction({ kind: 'edit', id })}
                  onDelete={handleDelete}
                  onToggleDone={handleToggleDone}
                  today={today}
                />
              )}
            </>
          )}
        </section>
        <div ref={detailRef} className="detail-column">
          {editingTask !== null ? (
            <TaskDetail task={editingTask} today={today}>
              {pendingAction !== null && (
                <UnsavedChangesBar
                  id={focusIds.unsavedBar}
                  onSave={() => editFormRef.current?.requestSubmit()}
                  onDiscard={handleDiscard}
                />
              )}
              <h3 className="edit-heading">Edit task</h3>
              {/* key: a different task gets a fresh form with its own values. */}
              <TaskForm
                key={editingTask.id}
                ref={editFormRef}
                initialValues={toFormValues(editingTask)}
                submitLabel="Save"
                onSubmit={handleSaveEdit}
                onCancel={handleCancelEdit}
                onDirtyChange={setEditIsDirty}
                tasks={tasks}
                editingId={editingTask.id}
                today={today}
                autoFocusTitle
              />
            </TaskDetail>
          ) : (
            <TaskDetail task={selectedTask} today={today} />
          )}
        </div>
      </main>
      {/* Hidden until the list is loaded: a task added before the load ends would be lost. */}
      {isReady && (
        <section className="panel" aria-labelledby="form-heading">
          <h2 id="form-heading">Add a task</h2>
          <TaskForm
            submitLabel="Add task"
            onSubmit={handleAdd}
            tasks={tasks}
            today={today}
            clearOnSubmit
          />
        </section>
      )}
      <LiveRegion announcement={announcement} />
    </div>
  );
}
