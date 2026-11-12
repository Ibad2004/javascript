import type { Task } from '../types';
import { getDueLabel, getDueStatus } from '../utils/dates';
import { focusIds } from '../utils/focusIds';
import { PRIORITY_LABELS } from '../utils/tasks';

type TaskItemProps = {
  task: Task;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleDone: (id: string) => void;
  /** No confirm dialog: App shows an Undo bar instead. */
  onDelete: (id: string) => void;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
  /**
   * A request for this task is running. Its checkbox, Edit and Delete are disabled until it
   * ends, so two requests for one task never overlap. aria-disabled (not `disabled`) keeps
   * keyboard focus on the control; App ignores the click while the task is busy.
   */
  busy?: boolean;
};

/**
 * One row: [checkbox] [select button with title and info] [Edit] [Delete].
 * The buttons sit SIDE BY SIDE, never inside each other:
 * a button inside a <button> is invalid HTML.
 */
export function TaskItem({
  task,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onToggleDone,
  onDelete,
  today,
  busy = false,
}: TaskItemProps) {
  const dueStatus = getDueStatus(task, today);

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
      {/* A real <button>: Tab reaches it, Enter and Space select it. */}
      <button
        type="button"
        id={focusIds.select(task.id)}
        className={`task-button priority-${task.priority}`}
        aria-pressed={isSelected}
        onClick={() => onSelect(task.id)}
      >
        <span className="task-title" dir="auto">
          {task.title}
        </span>
        {/* Status, priority and due date are written as text, not only shown by colour. */}
        <span className="task-meta">
          <span>{task.done ? 'Done' : 'Not done'}</span>
          <span>Priority: {PRIORITY_LABELS[task.priority]}</span>
          <span className={`due due-${dueStatus}`}>{getDueLabel(task, today)}</span>
          {isEditing && <span className="editing-tag">Editing</span>}
          {busy && <span className="saving-tag">Saving…</span>}
        </span>
      </button>
      <div className="task-actions">
        {/* The title is in the accessible name, so "Edit" buttons are told apart in a list of links/buttons. */}
        <button
          type="button"
          id={focusIds.edit(task.id)}
          aria-label={`Edit ${task.title}`}
          aria-disabled={busy}
          onClick={() => onEdit(task.id)}
        >
          Edit
        </button>
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
