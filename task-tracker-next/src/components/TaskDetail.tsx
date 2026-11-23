import { DueBadge } from "@/components/DueBadge";
import { PRIORITY_LABELS } from "@/lib/tasks";
import type { Task } from "@/types";

/** The task's fields. The title is the page's <h1>, so it is not repeated here. */
export function TaskDetail({ task }: { task: Task }) {
  return (
    <dl className="task-detail">
      <dt>Status</dt>
      <dd>{task.done ? "Done" : "Not done"}</dd>
      <dt>Priority</dt>
      <dd>
        <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
      </dd>
      <dt>Due date</dt>
      <dd>
        <DueBadge dueDate={task.dueDate} done={task.done} />
      </dd>
      <dt>Description</dt>
      {task.description.trim() === "" ? (
        <dd className="empty">No description</dd>
      ) : (
        <dd className="description" dir="auto">
          {task.description}
        </dd>
      )}
    </dl>
  );
}
