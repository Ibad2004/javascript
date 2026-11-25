import { getSummaryTextFromCounts } from "@/lib/tasks";

export function TaskSummary({ total, done }: { total: number; done: number }) {
  return <p className="summary">{getSummaryTextFromCounts(done, total)}</p>;
}
