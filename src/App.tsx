import { useState } from 'react';
import { Header } from './components/Header';
import { TaskDetail } from './components/TaskDetail';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskSummary } from './components/TaskSummary';
import { sampleTasks } from './data/sampleTasks';
import type { Task } from './types';
import { getVisibleTasks } from './utils/tasks';

type AppProps = {
  /** Lets tests start with their own list. The real app uses the sample data. */
  initialTasks?: Task[];
};

export function App({ initialTasks = sampleTasks }: AppProps) {
  // The setter is not used until tasks can be added (next update).
  const [tasks] = useState<Task[]>(initialTasks);
  const [hideDone, setHideDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derived on every render; never stored as a second copy in state.
  const visibleTasks = getVisibleTasks(tasks, hideDone);
  const selectedTask = visibleTasks.find((task) => task.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  return (
    <div className="app">
      <Header />
      <main className="layout">
        <section className="panel" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">Tasks</h2>
          <TaskSummary tasks={tasks} />
          <button type="button" aria-pressed={hideDone} onClick={() => setHideDone((h) => !h)}>
            {hideDone ? 'Show done tasks' : 'Hide done tasks'}
          </button>
          {visibleTasks.length === 0 ? (
            <p className="empty">No tasks to show.</p>
          ) : (
            <TaskList tasks={visibleTasks} selectedId={selectedId} onSelect={handleSelect} />
          )}
        </section>
        <TaskDetail task={selectedTask} />
      </main>
      <TaskForm />
    </div>
  );
}
