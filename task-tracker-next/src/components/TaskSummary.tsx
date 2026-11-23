import { getSummaryText } from "@/lib/tasks";
import type { Task } from "@/types";

export function TaskSummary({ tasks }: { tasks: readonly Task[] }) {
  return <p className="summary">{getSummaryText(tasks)}</p>;
}
