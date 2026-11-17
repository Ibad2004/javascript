export type Priority = "low" | "medium" | "high";

/** Same shape as task-tracker/src/types.ts, so the React app can use this API on Day 20. */
export type Task = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  priority: Priority;
  /** Date-only string "YYYY-MM-DD", or null when there is no due date. */
  dueDate: string | null;
  /** Embedded: up to 10 unique tags, 1 to 20 characters each. */
  tags: string[];
};

export type TaskInput = Pick<Task, "title" | "description" | "priority" | "dueDate" | "tags">;
export type TaskPatch = Partial<Omit<Task, "id">>;
