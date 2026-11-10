import type { Task } from '../types';
import { getDueLabel, getDueStatus } from '../utils/dates';
import { PRIORITY_LABELS } from '../utils/tasks';

type TaskItemProps = {
  task: Task;
  isSelected: boolean;
  onSelect: (id: string) => void;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
};

export function TaskItem({ task, isSelected, onSelect, today }: TaskItemProps) {
  const dueStatus = getDueStatus(task, today);

  return (
    <li>
      {/* A real <button>: Tab reaches it, Enter and Space select it. */}
      <button
        type="button"
        className={`task-button priority-${task.priority}${task.done ? ' is-done' : ''}`}
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
        </span>
      </button>
    </li>
  );
}
