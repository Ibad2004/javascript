import { useSearchParams } from 'react-router';
import { Notice } from '../components/Notice';
import { TaskFilters } from '../components/TaskFilters';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { TaskSummary } from '../components/TaskSummary';
import { UndoBar } from '../components/UndoBar';
import { useTasksContext } from '../context/TasksContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { Task, TaskInput } from '../types';
import {
  DEFAULT_FILTERS,
  countByStatus,
  filterTasks,
  matchesFilters,
  readFilters,
  writeFilters,
  type Filters,
} from '../utils/filters';
import { focusIds } from '../utils/focusIds';
import { pageTitle } from '../utils/pageTitle';
import { pluralize } from '../utils/plural';
import { getListStatusText } from '../utils/tasks';

/** "/": the summary, the filters, the list and the add form. */
export function TaskListPage({ today }: { today: string }) {
  const {
    loadState,
    retryLoad,
    tasks,
    skippedCount,
    busyIds,
    lastDeleted,
    clearLastDeleted,
    filterNotice,
    dismissFilterNotice,
    requestFocus,
    addTask,
    removeTask,
    undoDelete,
    toggleDone,
  } = useTasksContext();
  // The filters live in the URL (?status=done&priority=high&q=milk): reload, Back/Forward
  // and shared links keep them. The URL is the ONLY copy; nothing is mirrored in state.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  useDocumentTitle(pageTitle());

  // Calculated during render: no effect, no filtered copy in state.
  const visibleTasks = filterTasks(tasks, filters);
  const counts = countByStatus(tasks);
  const isReady = loadState.status === 'ready';
  const noMatch = tasks.length > 0 && visibleTasks.length === 0;
  const isHidden = (task: Task) => !matchesFilters(task, filters);

  /** Status and priority push a history entry (Back undoes them); typing replaces it. */
  function setFilters(next: Filters, { replace = false } = {}) {
    setSearchParams(writeFilters(next), { replace });
    // "…, but hidden by your filters" was about the OLD filters: it could now be wrong.
    dismissFilterNotice();
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    requestFocus(focusIds.search);
  }

  function showAll(taskId: string) {
    setFilters(DEFAULT_FILTERS);
    // The button disappears with the message; focus goes to the task it was about.
    requestFocus(focusIds.link(taskId));
  }

  /** Where focus goes when `id` leaves the visible list: the next task, else the previous one. */
  function neighbourFocusId(id: string): string {
    const index = visibleTasks.findIndex((task) => task.id === id);
    const neighbour = visibleTasks[index + 1] ?? visibleTasks[index - 1];
    return neighbour !== undefined ? focusIds.link(neighbour.id) : focusIds.pageHeading;
  }

  function handleToggleDone(id: string) {
    // Read before the update: once hidden, the task is no longer in visibleTasks.
    void toggleDone(id, { hiddenBy: isHidden, hiddenFocusId: neighbourFocusId(id) });
  }

  function handleDelete(id: string) {
    void removeTask(id, { focusId: neighbourFocusId(id) });
  }

  function handleAdd(input: TaskInput) {
    return addTask(input, { hiddenBy: isHidden });
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
            <TaskFilters
              filters={filters}
              counts={counts}
              onStatusChange={(status) => setFilters({ ...filters, status })}
              onPriorityChange={(priority) => setFilters({ ...filters, priority })}
              onSearchChange={(q) => setFilters({ ...filters, q }, { replace: true })}
            />
            <p role="status" className="list-status">
              {getListStatusText(tasks.length, visibleTasks.length)}
            </p>
            {filterNotice !== null && (
              <p className="hidden-note">
                {filterNotice.text}{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => showAll(filterNotice.taskId)}
                >
                  Show all
                </button>
              </p>
            )}
            {lastDeleted !== null && (
              <UndoBar
                key={lastDeleted.task.id}
                message="Task deleted."
                onUndo={() => void undoDelete({ hiddenBy: isHidden })}
                onTimeout={clearLastDeleted}
                busy={busyIds.has(lastDeleted.task.id)}
              />
            )}
            {noMatch && (
              <p className="no-match">
                No tasks match these filters.{' '}
                <button type="button" className="link-button" onClick={clearFilters}>
                  Clear filters
                </button>
              </p>
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
            onSubmit={handleAdd}
            tasks={tasks}
            today={today}
            clearOnSubmit
          />
        </section>
      )}
    </main>
  );
}
