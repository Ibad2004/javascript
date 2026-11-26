import Link from "next/link";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { DueBadge } from "@/components/DueBadge";
import { TaskToggle } from "@/components/TaskToggle";
import { PRIORITY_LABELS } from "@/lib/tasks";
import type { Task } from "@/types";

export function TaskItem({ task }: { task: Task }) {
  return (
    <li className={`task-item priority-${task.priority}${task.done ? " is-done" : ""}`}>
      <TaskToggle id={task.id} title={task.title} done={task.done} variant="item" />
      <Link href={`/tasks/${encodeURIComponent(task.id)}`} className="task-button">
        <span className="task-title" dir="auto">
          {task.title}
        </span>
        <span className="task-meta">
          <span>{task.done ? "Done" : "Not done"}</span>
          <span className={`badge badge-${task.priority}`}>Priority: {PRIORITY_LABELS[task.priority]}</span>
          <DueBadge dueDate={task.dueDate} done={task.done} />
        </span>
      </Link>
      <div className="task-actions">
        <DeleteTaskButton id={task.id} title={task.title} focusAfterId="list-heading" />
      </div>
    </li>
  );
}
