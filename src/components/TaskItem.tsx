import type { Task } from '../types';
import { formatDueDate } from '../utils/dates';
import { PRIORITY_LABELS } from '../utils/tasks';

type TaskItemProps = {
  task: Task;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

export function TaskItem({ task, isSelected, onSelect }: TaskItemProps) {
  return (
    <li>
      <button
        type="button"
        className={`task-button priority-${task.priority}`}
        aria-pressed={isSelected}
        onClick={() => onSelect(task.id)}
      >
        <span className="task-title" dir="auto">
          {task.title}
        </span>
        <span className="task-meta">
          <span>{task.done ? 'Done' : 'Not done'}</span>
          <span>Priority: {PRIORITY_LABELS[task.priority]}</span>
          <span>
            {task.dueDate === null ? 'No due date' : `Due ${formatDueDate(task.dueDate)}`}
          </span>
        </span>
      </button>
    </li>
  );
}
