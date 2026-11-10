import { useRef, useState } from 'react';
import { Header } from './components/Header';
import { HiddenTasksNote } from './components/HiddenTasksNote';
import { TaskDetail } from './components/TaskDetail';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskSummary } from './components/TaskSummary';
import { createSampleTasks } from './data/sampleTasks';
import type { Task } from './types';
import { scrollIntoViewOnNarrowScreen } from './utils/scroll';
import { countDone, getListStatusText, getVisibleTasks } from './utils/tasks';

type AppProps = {
  /** Lets tests start with their own list. The real app uses the sample data. */
  initialTasks?: Task[];
  /** The user's local date, "YYYY-MM-DD". main.tsx passes the real one; tests pass a fake one. */
  today: string;
};

export function App({ initialTasks, today }: AppProps) {
  // The setter is not used until tasks can be added (next update).
  // The function form builds the sample tasks only once, on the first render.
  const [tasks] = useState<Task[]>(() => initialTasks ?? createSampleTasks(today));
  const [hideDone, setHideDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Everything below is derived on every render; nothing is stored twice.
  const visibleTasks = getVisibleTasks(tasks, hideDone);
  // Looked up in the VISIBLE list: if the filter hides the selected task,
  // this becomes null and the detail panel shows its empty message.
  const selectedTask = visibleTasks.find((task) => task.id === selectedId) ?? null;
  const hiddenCount = hideDone ? countDone(tasks) : 0;

  function handleSelect(id: string) {
    const isDeselect = id === selectedId;
    setSelectedId((current) => (current === id ? null : id));
    if (!isDeselect) scrollIntoViewOnNarrowScreen(detailRef.current);
  }

  function toggleHideDone() {
    setHideDone((h) => !h);
  }

  return (
    <div className="app">
      <Header />
      <main className="layout">
        <section className="panel" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">Tasks</h2>
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
          {hiddenCount > 0 && <HiddenTasksNote hiddenCount={hiddenCount} onShow={toggleHideDone} />}
          {visibleTasks.length > 0 && (
            <TaskList
              tasks={visibleTasks}
              selectedId={selectedId}
              onSelect={handleSelect}
              today={today}
            />
          )}
        </section>
        <div ref={detailRef} className="detail-column">
          <TaskDetail task={selectedTask} today={today} />
        </div>
      </main>
      <TaskForm />
    </div>
  );
}
