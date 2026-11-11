import type { Task } from '../types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: readonly Task[];
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
};

export function TaskList({ tasks, selectedId, editingId, onSelect, onEdit, today }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        // key = the task's id, never the array index: the order changes when we sort, filter,
        // add and delete, and React must keep each row's DOM and focus with the right task.
        <TaskItem
          key={task.id}
          task={task}
          isSelected={task.id === selectedId}
          isEditing={task.id === editingId}
          onSelect={onSelect}
          onEdit={onEdit}
          today={today}
        />
      ))}
    </ul>
  );
}
