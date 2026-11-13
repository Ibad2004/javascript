import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Notice } from '../components/Notice';
import { TaskDetail } from '../components/TaskDetail';
import { TaskForm } from '../components/TaskForm';
import { UnsavedChangesBar } from '../components/UnsavedChangesBar';
import { useTasksContext } from '../context/TasksContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { TaskInput } from '../types';
import { focusIds } from '../utils/focusIds';
import { pageTitle } from '../utils/pageTitle';
import { toFormValues } from '../utils/tasks';

/** The list's "Edit" link sends { edit: true } so the page opens with the form open. */
function wantsEdit(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'edit' in state && state.edit === true;
}

/** "/tasks/:id". key = id: another task gets a fresh page (no edit state carried over). */
export function TaskDetailPage({ today }: { today: string }) {
  // React Router has already decoded the id ("a%20b" → "a b"). A missing id is never a match.
  const { id = '' } = useParams();
  return <TaskDetailView key={id} id={id} today={today} />;
}

function TaskDetailView({ id, today }: { id: string; today: string }) {
  const {
    loadState,
    retryLoad,
    tasks,
    busyIds,
    isBusy,
    announce,
    requestFocus,
    saveTask,
    removeTask,
    toggleDone,
  } = useTasksContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(() => wantsEdit(location.state));
  const [isDirty, setIsDirty] = useState(false);
  // Where the user tried to go while the form had unsaved changes.
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Never "Task not found" while loading: the task may simply not be here YET.
  const task = loadState.status === 'ready' ? (tasks.find((t) => t.id === id) ?? null) : null;
  const heading =
    loadState.status === 'loading'
      ? 'Loading task…'
      : loadState.status === 'error'
        ? "Couldn't load the task"
        : task === null
          ? 'Task not found'
          : task.title;
  useDocumentTitle(pageTitle(heading));
  const busy = busyIds.has(id);

  /** The task is gone (deleted here or in another tab): the list shows why. */
  function backToList() {
    // replace: Back must not return to a page for a task that no longer exists.
    void navigate('/', { replace: true });
  }

  function stopEditing() {
    setIsEditing(false);
    setIsDirty(false);
    setPendingTo(null);
  }

  /**
   * In-app links ask first when the form has unsaved changes (inline bar, no window.confirm).
   * A new-tab click (Ctrl/Cmd/Shift/middle) loses nothing here, so it is let through.
   * Known limit: the browser's Back button cannot be blocked in declarative mode.
   */
  function guardLink(event: MouseEvent<HTMLAnchorElement>, to: string) {
    if (!isEditing || !isDirty) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    setPendingTo(to);
    announce('You have unsaved changes');
    requestFocus(focusIds.unsavedBar);
  }

  async function handleSave(input: TaskInput): Promise<string | null> {
    const to = pendingTo;
    let missing = false;
    const error = await saveTask(id, input, {
      onMissing: () => {
        missing = true;
        backToList();
      },
    });
    if (error !== null || missing) return error;
    stopEditing();
    if (to !== null) void navigate(to);
    else requestFocus(focusIds.detailEdit);
    return null;
  }

  function handleCancel() {
    stopEditing();
    requestFocus(focusIds.detailEdit);
  }

  function handleDiscard() {
    const to = pendingTo;
    stopEditing();
    if (to !== null) void navigate(to);
  }

  function startEditing() {
    if (isBusy(id)) return;
    setIsEditing(true);
  }

  function handleDelete() {
    if (isBusy(id)) return;
    // Same batch as the delete: the list (with its Undo bar) shows next, not "Task not found".
    void removeTask(id);
    backToList();
  }

  return (
    <main aria-busy={loadState.status === 'loading'}>
      <p className="back-link">
        <Link to="/" onClick={(event) => guardLink(event, '/')}>
          <span aria-hidden="true">← </span>Back to tasks
        </Link>
      </p>
      <section className="panel" aria-labelledby={focusIds.pageHeading}>
        <h1 id={focusIds.pageHeading} tabIndex={-1} dir="auto" className="page-title">
          {heading}
        </h1>
        {loadState.status === 'error' && (
          <div className="load-error">
            <p>{loadState.message}</p>
            <button type="button" onClick={retryLoad}>
              Try again
            </button>
          </div>
        )}
        {loadState.status === 'ready' && <Notice />}
        {loadState.status === 'ready' && task === null && (
          <p>This task does not exist. It may have been deleted, or the link is wrong.</p>
        )}
        {task !== null && (
          <>
            {isEditing ? (
              <>
                {pendingTo !== null && (
                  <UnsavedChangesBar
                    id={focusIds.unsavedBar}
                    onSave={() => formRef.current?.requestSubmit()}
                    onDiscard={handleDiscard}
                  />
                )}
                <h2 className="edit-heading">Edit task</h2>
                <TaskForm
                  ref={formRef}
                  initialValues={toFormValues(task)}
                  submitLabel="Save"
                  onSubmit={handleSave}
                  onCancel={handleCancel}
                  onDirtyChange={setIsDirty}
                  tasks={tasks}
                  editingId={task.id}
                  today={today}
                  autoFocusTitle
                />
              </>
            ) : (
              <TaskDetail task={task} today={today} />
            )}
            <div className="detail-actions">
              <label className="detail-done">
                <input
                  type="checkbox"
                  id={focusIds.done(task.id)}
                  checked={task.done}
                  aria-disabled={busy}
                  onChange={() => void toggleDone(id, { onMissing: backToList })}
                />{' '}
                Mark as done
              </label>
              {busy && <span className="saving-tag">Saving…</span>}
              {!isEditing && (
                <button
                  type="button"
                  id={focusIds.detailEdit}
                  aria-disabled={busy}
                  onClick={startEditing}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="delete-button"
                aria-disabled={busy}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
