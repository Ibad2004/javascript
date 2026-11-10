import type { Task } from '../types';
import { getSummaryText } from '../utils/tasks';

type TaskSummaryProps = {
  tasks: readonly Task[];
};

export function TaskSummary({ tasks }: TaskSummaryProps) {
  return <p className="summary">{getSummaryText(tasks)}</p>;
}
