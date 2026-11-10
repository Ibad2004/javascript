import type { Task } from '../types';
import { getDueLabel, getDueStatus } from '../utils/dates';
import { PRIORITY_LABELS } from '../utils/tasks';

type TaskDetailProps = {
  task: Task | null;
  /** The user's local date, "YYYY-MM-DD". */
  today: string;
};

export function TaskDetail({ task, today }: TaskDetailProps) {
  return (
    <section className="panel task-detail" aria-labelledby="detail-heading">
      <h2 id="detail-heading">Task details</h2>
      {task === null ? (
        <p className="empty">Select a task to see its details</p>
      ) : (
        <>
          <h3 className="task-title" dir="auto">
            {task.title}
          </h3>
          <dl>
            <dt>Status</dt>
            <dd>{task.done ? 'Done' : 'Not done'}</dd>
            <dt>Priority</dt>
            <dd>{PRIORITY_LABELS[task.priority]}</dd>
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
        </>
      )}
    </section>
  );
}
