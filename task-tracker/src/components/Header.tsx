import { useTasksContext } from '../context/TasksContext';

export function Header() {
  const { dataLocation } = useTasksContext();
  return (
    <header className="app-header">
      {/* Not a heading: each page has its own <h1>, which gets focus after navigation. */}
      <p className="app-name">Task Tracker</p>
      <p className="note">{dataLocation}</p>
    </header>
  );
}
