import type { Task } from '../types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: readonly Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
};

export function TaskList({ tasks, selectedId, onSelect, today }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        // key = the task's id, never the array index: the order changes when we sort and filter.
        <TaskItem
          key={task.id}
          task={task}
          isSelected={task.id === selectedId}
          onSelect={onSelect}
          today={today}
        />
      ))}
    </ul>
  );
}
