import { useTasksContext } from '../context/TasksContext';

/** The last failed save, shown on every page until dismissed or the next action. */
export function Notice() {
  const { notice, dismissNotice } = useTasksContext();
  if (notice === null) return null;
  return (
    <div className="notice">
      <p>{notice}</p>
      <button type="button" onClick={dismissNotice}>
        Dismiss
      </button>
    </div>
  );
}
