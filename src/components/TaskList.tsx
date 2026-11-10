import type { Task } from '../types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: readonly Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function TaskList({ tasks, selectedId, onSelect }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isSelected={task.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
