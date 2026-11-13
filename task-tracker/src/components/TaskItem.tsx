import { Link, useLocation } from 'react-router';
import type { Task } from '../types';
import { getDueLabel, getDueStatus } from '../utils/dates';
import { focusIds } from '../utils/focusIds';
import { taskPath } from '../utils/pageTitle';
import { PRIORITY_LABELS } from '../utils/tasks';

type TaskItemProps = {
  task: Task;
  onToggleDone: (id: string) => void;
  /** No confirm dialog: the list shows an Undo bar instead. */
  onDelete: (id: string) => void;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
  /**
   * A request for this task is running. Its checkbox and Delete are disabled until it
   * ends, so two requests for one task never overlap. aria-disabled (not `disabled`) keeps
   * keyboard focus on the control; the hook ignores the click while the task is busy.
   */
  busy?: boolean;
};

/**
 * One row: [checkbox] [link to the task's page] [Edit] [Delete].
 * The title is a real <Link> (an <a href>), so a middle click or "open in new tab" works.
 */
export function TaskItem({ task, onToggleDone, onDelete, today, busy = false }: TaskItemProps) {
  const dueStatus = getDueStatus(task, today);
  const path = taskPath(task.id);
  // The list's filters (?status=done…) travel with the link, so "Back to tasks" keeps them.
  const listSearch = useLocation().search;

  return (
    <li className={`task-item${task.done ? ' is-done' : ''}`} aria-busy={busy}>
      {/* The label text is hidden on screen (the title is right next to it) but read by screen readers. */}
      <label className="task-check">
        <input
          type="checkbox"
          id={focusIds.done(task.id)}
          checked={task.done}
          aria-disabled={busy}
          onChange={() => onToggleDone(task.id)}
        />
        <span className="visually-hidden">Mark {task.title} as done</span>
      </label>
      <Link
        to={path}
        state={{ listSearch }}
        id={focusIds.link(task.id)}
        className={`task-button priority-${task.priority}`}
      >
        <span className="task-title" dir="auto">
          {task.title}
        </span>
        {/* Status, priority and due date are written as text, not only shown by colour. */}
        <span className="task-meta">
          <span>{task.done ? 'Done' : 'Not done'}</span>
          <span>Priority: {PRIORITY_LABELS[task.priority]}</span>
          <span className={`due due-${dueStatus}`}>{getDueLabel(task, today)}</span>
          {busy && <span className="saving-tag">Saving…</span>}
        </span>
      </Link>
      <div className="task-actions">
        {/* Opens the task's page with the edit form already open. */}
        <Link
          to={path}
          state={{ edit: true, listSearch }}
          id={focusIds.edit(task.id)}
          className="action-link"
          aria-label={`Edit ${task.title}`}
        >
          Edit
        </Link>
        <button
          type="button"
          id={focusIds.remove(task.id)}
          className="delete-button"
          aria-label={`Delete ${task.title}`}
          aria-disabled={busy}
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
