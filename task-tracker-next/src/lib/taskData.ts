import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db";
import type { Filters, StatusFilter } from "@/lib/filters";
import { buildTaskQuery, isObjectIdString, serializeTask } from "@/lib/taskQuery";
import { sortTasks } from "@/lib/tasks";
import { TaskModel } from "@/models/Task";
import type { Task } from "@/types";

/** Tasks that match the filters (filtered in the database), in the app's usual order. */
export async function getTasks(filters: Filters): Promise<Task[]> {
  await connectDb();
  const docs = await TaskModel.find(buildTaskQuery(filters)).lean();
  return sortTasks(docs.map(serializeTask));
}

/** Counts over ALL tasks, for the status buttons and the summary. */
export async function getTaskCounts(): Promise<Record<StatusFilter, number>> {
  await connectDb();
  const [all, done] = await Promise.all([TaskModel.countDocuments({}), TaskModel.countDocuments({ done: true })]);
  return { all, done, pending: all - done };
}

/** null for an invalid id ("bad-id") or a missing task. cache() = one query per request. */
export const getTaskById = cache(async (id: string): Promise<Task | null> => {
  if (!isObjectIdString(id)) return null;
  await connectDb();
  const doc = await TaskModel.findById(id).lean();
  return doc === null ? null : serializeTask(doc);
});
