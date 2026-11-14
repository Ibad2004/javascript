import type { Task } from '../types';
import { getDueLabel, getDueStatus } from '../utils/dates';
import { PRIORITY_LABELS } from '../utils/tasks';

type TaskDetailProps = {
  task: Task;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
};

/** The task's fields. The title is the page's <h1>, so it is not repeated here. */
export function TaskDetail({ task, today }: TaskDetailProps) {
  return (
    <dl className="task-detail">
      <dt>Status</dt>
      <dd>{task.done ? 'Done' : 'Not done'}</dd>
      <dt>Priority</dt>
      <dd>
        <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
      </dd>
      <dt>Due date</dt>
      <dd className={`due due-${getDueStatus(task, today)}`}>{getDueLabel(task, today)}</dd>
      <dt>Description</dt>
      {task.description.trim() === '' ? (
        <dd className="empty">No description</dd>
      ) : (
        <dd className="description" dir="auto">
          {task.description}
        </dd>
      )}
    </dl>
  );
}
