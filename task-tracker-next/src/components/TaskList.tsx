import Link from "next/link";
import { TaskItem } from "@/components/TaskItem";
import type { Task } from "@/types";

type TaskListProps = {
  /** The tasks that passed the filters. */
  tasks: readonly Task[];
  /** How many tasks exist before filtering. */
  totalCount: number;
};

export function TaskList({ tasks, totalCount }: TaskListProps) {
  if (totalCount === 0) return <p className="empty">No tasks yet</p>;
  if (tasks.length === 0) {
    return (
      <p className="no-match">
        No tasks match these filters. <Link href="/">Clear filters</Link>
      </p>
    );
  }
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
