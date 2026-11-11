import { useRef, useState } from 'react';
import { LiveRegion, type Announcement } from './components/LiveRegion';
import { Header } from './components/Header';
import { HiddenTasksNote } from './components/HiddenTasksNote';
import { TaskDetail } from './components/TaskDetail';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskSummary } from './components/TaskSummary';
import { createSampleTasks } from './data/sampleTasks';
import type { Task, TaskInput } from './types';
import { scrollIntoViewOnNarrowScreen } from './utils/scroll';
import {
  addTask,
  countDone,
  getListStatusText,
  getVisibleTasks,
  makeId as defaultMakeId,
} from './utils/tasks';

type AppProps = {
  /** Lets tests start with their own list. The real app uses the sample data. */
  initialTasks?: Task[];
  /** The user's local date, "YYYY-MM-DD". main.tsx passes the real one; tests pass a fake one. */
  today: string;
  /** Makes the id of a new task. Tests pass a fake one to get predictable ids. */
  makeId?: () => string;
};

export function App({ initialTasks, today, makeId = defaultMakeId }: AppProps) {
  // The function form builds the sample tasks only once, on the first render.
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks ?? createSampleTasks(today));
  const [hideDone, setHideDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement>({ text: '', id: 0 });
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

  /** Screen readers read this out. A new id makes the same text ("Task added" twice) be read again. */
  function announce(text: string) {
    setAnnouncement((old) => ({ text, id: old.id + 1 }));
  }

  function handleAdd(input: TaskInput) {
    // The id is made here, in the event handler, so the updater function stays pure.
    const id = makeId();
    setTasks((old) => addTask(old, input, id));
    announce('Task added');
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
