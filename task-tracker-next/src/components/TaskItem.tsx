import Link from "next/link";
import { DueBadge } from "@/components/DueBadge";
import { PRIORITY_LABELS } from "@/lib/tasks";
import type { Task } from "@/types";

export function TaskItem({ task }: { task: Task }) {
  return (
    <li className={`task-item priority-${task.priority}${task.done ? " is-done" : ""}`}>
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
    </li>
  );
}
