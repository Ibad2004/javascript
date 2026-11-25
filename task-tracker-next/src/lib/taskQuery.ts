import { normalizeSearch, type Filters } from "@/lib/filters";
import type { Priority, Task } from "@/types";

/** Escapes every regex special character, so "c++" or "(" is matched as plain text. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type TaskQuery = {
  done?: boolean;
  priority?: Priority;
  title?: { $regex: string; $options: "i" };
};

/** The MongoDB filter for the URL filters. The database does the filtering. */
export function buildTaskQuery(filters: Filters): TaskQuery {
  const query: TaskQuery = {};
  if (filters.status !== "all") query.done = filters.status === "done";
  if (filters.priority !== "any") query.priority = filters.priority;
  const needle = normalizeSearch(filters.q);
  if (needle !== "") query.title = { $regex: escapeRegex(needle), $options: "i" };
  return query;
}

/** 24 hex characters. (mongoose.isValidObjectId also accepts any 12-character string.) */
export function isObjectIdString(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

/** The shape of a `.lean()` document, as far as we use it. */
export type TaskDoc = {
  _id: { toString(): string };
  title: string;
  description?: string | null;
  done?: boolean | null;
  priority?: Priority | null;
  dueDate?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

/** Plain data only: _id becomes `id`, dates become ISO strings. Safe to pass to client components. */
export function serializeTask(doc: TaskDoc): Task {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? "",
    done: doc.done ?? false,
    priority: doc.priority ?? "medium",
    dueDate: doc.dueDate ?? null,
    ...(doc.createdAt ? { createdAt: doc.createdAt.toISOString() } : {}),
    ...(doc.updatedAt ? { updatedAt: doc.updatedAt.toISOString() } : {}),
  };
}
