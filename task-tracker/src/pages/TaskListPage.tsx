import { useState } from 'react';
import { HiddenTasksNote } from '../components/HiddenTasksNote';
import { Notice } from '../components/Notice';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { TaskSummary } from '../components/TaskSummary';
import { UndoBar } from '../components/UndoBar';
import { useTasksContext } from '../context/TasksContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { focusIds } from '../utils/focusIds';
import { pageTitle } from '../utils/pageTitle';
import { pluralize } from '../utils/plural';
import { countDone, getListStatusText, getVisibleTasks } from '../utils/tasks';

/** "/": the summary, the list and the add form. */
export function TaskListPage({ today }: { today: string }) {
  const {
    loadState,
    retryLoad,
    tasks,
    skippedCount,
    busyIds,
    lastDeleted,
    clearLastDeleted,
    addTask,
    removeTask,
    undoDelete,
    toggleDone,
  } = useTasksContext();
  const [hideDone, setHideDone] = useState(false);
  useDocumentTitle(pageTitle());

  // Derived on every render; nothing is stored twice.
  const visibleTasks = getVisibleTasks(tasks, hideDone);
  const hiddenCount = hideDone ? countDone(tasks) : 0;
  const isReady = loadState.status === 'ready';

  /** Where focus goes when `id` leaves the visible list: the next task, else the previous one. */
  function neighbourFocusId(id: string): string {
    const index = visibleTasks.findIndex((task) => task.id === id);
    const neighbour = visibleTasks[index + 1] ?? visibleTasks[index - 1];
    return neighbour !== undefined ? focusIds.link(neighbour.id) : focusIds.pageHeading;
  }

  function handleToggleDone(id: string) {
    // Read before the update: once hidden, the task is no longer in visibleTasks.
    void toggleDone(id, hideDone ? { hiddenFocusId: neighbourFocusId(id) } : {});
  }

  function handleDelete(id: string) {
    void removeTask(id, { focusId: neighbourFocusId(id) });
  }

  function toggleHideDone() {
    setHideDone((h) => !h);
  }

  return (
    <main>
      <section
        className="panel"
        aria-labelledby={focusIds.pageHeading}
        aria-busy={loadState.status === 'loading'}
      >
        {/* tabIndex -1: focus lands here after navigation and after the last task is deleted. */}
        <h1 id={focusIds.pageHeading} tabIndex={-1}>
          Tasks
        </h1>
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
            <Notice />
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
                onUndo={() => void undoDelete()}
                onTimeout={clearLastDeleted}
                busy={busyIds.has(lastDeleted.task.id)}
              />
            )}
            {hiddenCount > 0 && (
              <HiddenTasksNote hiddenCount={hiddenCount} onShow={toggleHideDone} />
            )}
            {visibleTasks.length > 0 && (
              <TaskList
                tasks={visibleTasks}
                busyIds={busyIds}
                onDelete={handleDelete}
                onToggleDone={handleToggleDone}
                today={today}
              />
            )}
          </>
        )}
      </section>
      {/* Hidden until the list is loaded: a task added before the load ends would be lost. */}
      {isReady && (
        <section className="panel" aria-labelledby="form-heading">
          <h2 id="form-heading">Add a task</h2>
          <TaskForm
            submitLabel="Add task"
            onSubmit={addTask}
            tasks={tasks}
            today={today}
            clearOnSubmit
          />
        </section>
      )}
    </main>
  );
}
