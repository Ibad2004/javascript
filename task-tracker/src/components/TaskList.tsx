import type { Task } from '../types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: readonly Task[];
  /** Tasks with a request running (see TaskItem's `busy`). */
  busyIds: ReadonlySet<string>;
  onDelete: (id: string) => void;
  onToggleDone: (id: string) => void;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
};

export function TaskList({ tasks, busyIds, ...handlers }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        // key = the task's id, never the array index: the order changes when we sort, filter,
        // add and delete, and React must keep each row's DOM and focus with the right task.
        <TaskItem key={task.id} task={task} busy={busyIds.has(task.id)} {...handlers} />
      ))}
    </ul>
  );
}
