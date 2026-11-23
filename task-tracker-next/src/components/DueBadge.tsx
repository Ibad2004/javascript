"use client";
// Client: "Overdue" / "Due today" depend on the visitor's local date, which only the browser knows.
import { formatDueDate, getDueLabel, getDueStatus } from "@/lib/dates";
import { useLocalToday } from "@/lib/useLocalToday";

type DueBadgeProps = { dueDate: string | null; done: boolean };

/** The server renders the plain date; after mount the label is worked out with the local today. */
export function DueBadge({ dueDate, done }: DueBadgeProps) {
  const today = useLocalToday();
  if (today === null) return <span className="due due-scheduled">{formatDueDate(dueDate)}</span>;
  const task = { dueDate, done };
  return <span className={`due due-${getDueStatus(task, today)}`}>{getDueLabel(task, today)}</span>;
}
