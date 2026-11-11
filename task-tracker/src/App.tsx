import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { HiddenTasksNote } from './components/HiddenTasksNote';
import { LiveRegion, type Announcement } from './components/LiveRegion';
import { TaskDetail } from './components/TaskDetail';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskSummary } from './components/TaskSummary';
import { UndoBar } from './components/UndoBar';
import { UnsavedChangesBar } from './components/UnsavedChangesBar';
import { createSampleTasks } from './data/sampleTasks';
import type { Task, TaskInput } from './types';
import { focusIds } from './utils/focusIds';
import { scrollIntoViewOnNarrowScreen } from './utils/scroll';
import {
  addTask,
  countDone,
  deleteTask,
  getListStatusText,
  getVisibleTasks,
  makeId as defaultMakeId,
  restoreTask,
  toFormValues,
  updateTask,
} from './utils/tasks';

type AppProps = {
  /** Lets tests start with their own list. The real app uses the sample data. */
  initialTasks?: Task[];
  /** The user's local date, "YYYY-MM-DD". main.tsx passes the real one; tests pass a fake one. */
  today: string;
  /** Makes the id of a new task. Tests pass a fake one to get predictable ids. */
  makeId?: () => string;
};

/** What the user tried to do while the edit form had unsaved changes. */
type PendingAction = { kind: 'select' | 'edit'; id: string };

/** The last deleted task and where it was, so Undo can put it back in the same place. */
type DeletedTask = { task: Task; index: number };

export function App({ initialTasks, today, makeId = defaultMakeId }: AppProps) {
  // The function form builds the sample tasks only once, on the first render.
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks ?? createSampleTasks(today));
  const [hideDone, setHideDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Only one task can be edited at a time, so one id is enough.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIsDirty, setEditIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Only the latest delete can be undone, so one slot is enough.
  const [lastDeleted, setLastDeleted] = useState<DeletedTask | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement>({ text: '', id: 0 });
  // A new object every time, so asking twice for the same element still re-renders and focuses.
  const [focusRequest, setFocusRequest] = useState<{ elementId: string } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  // Everything below is derived on every render; nothing is stored twice.
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

  function requestFocus(elementId: string) {
    setFocusRequest({ elementId });
  }

  /** Screen readers read this out. A new id makes the same text ("Task added" twice) be read again. */
  function announce(text: string) {
    setAnnouncement((old) => ({ text, id: old.id + 1 }));
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

  function handleAdd(input: TaskInput) {
    // The id is made here, in the event handler, so the updater function stays pure.
    const id = makeId();
    setTasks((old) => addTask(old, input, id));
    announce('Task added');
  }

  function handleSaveEdit(input: TaskInput) {
    if (editingId === null) return;
    const id = editingId;
    // updateTask works on the task as it is NOW in state (old), and only changes the
    // edited fields. So a task ticked done while the form was open stays done.
    setTasks((old) => updateTask(old, id, input));
    const action = pendingAction;
    stopEditing();
    announce('Changes saved');
    if (action !== null) runAction(action);
    else requestFocus(focusIds.select(id));
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

  function handleDelete(id: string) {
    const index = tasks.findIndex((task) => task.id === id);
    const task = tasks[index];
    if (task === undefined) return;
    const neighbour = neighbourOf(id);

    setTasks((old) => deleteTask(old, id));
    setLastDeleted({ task, index });
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) stopEditing();
    announce('Task deleted');
    // Focus must not be lost (it was on the Delete button, which is now gone).
    requestFocus(neighbour !== null ? focusIds.select(neighbour.id) : focusIds.listHeading);
  }

  function handleUndo() {
    if (lastDeleted === null) return;
    const { task, index } = lastDeleted;
    setTasks((old) => restoreTask(old, task, index));
    setLastDeleted(null);
    announce('Task restored');
    // If "Hide done tasks" hides it, the effect falls back to the list heading.
    requestFocus(focusIds.select(task.id));
  }

  function toggleHideDone() {
    setHideDone((h) => !h);
  }

  return (
    <div className="app">
      <Header />
      <main className="layout">
        <section className="panel" aria-labelledby="tasks-heading">
          {/* tabIndex -1: focus can land here after the last task is deleted. */}
          <h2 id="tasks-heading" tabIndex={-1}>
            Tasks
          </h2>
          <TaskSummary tasks={tasks} />
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
            />
          )}
          {hiddenCount > 0 && <HiddenTasksNote hiddenCount={hiddenCount} onShow={toggleHideDone} />}
          {visibleTasks.length > 0 && (
            <TaskList
              tasks={visibleTasks}
              selectedId={selectedId}
              editingId={editingId}
              onSelect={(id) => guardedAction({ kind: 'select', id })}
              onEdit={(id) => guardedAction({ kind: 'edit', id })}
              onDelete={handleDelete}
              today={today}
            />
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
      <LiveRegion announcement={announcement} />
    </div>
  );
}
