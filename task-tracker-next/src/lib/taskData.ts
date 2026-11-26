import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db";
import type { Filters, StatusFilter } from "@/lib/filters";
import { buildTaskQuery, isObjectIdString, serializeTask } from "@/lib/taskQuery";
import { sortTasks } from "@/lib/tasks";
import { TaskModel } from "@/models/Task";
import type { Task, TaskInput } from "@/types";

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

// Writes. The callers (server actions) validate the input and the id first.

/** Returns the new task's id. */
export async function insertTask(input: TaskInput): Promise<string> {
  await connectDb();
  const doc = await TaskModel.create({ ...input, done: false });
  return doc._id.toString();
}

/** Changes only the four edited fields, so `done` is kept. false = the task does not exist. */
export async function saveTask(id: string, input: TaskInput): Promise<boolean> {
  await connectDb();
  const { title, description, priority, dueDate } = input;
  const doc = await TaskModel.findByIdAndUpdate(id, { $set: { title, description, priority, dueDate } }).lean();
  return doc !== null;
}

/** Flips `done` in one database step (no read-then-write). false = the task does not exist. */
export async function toggleTaskDone(id: string): Promise<boolean> {
  await connectDb();
  const flip = [{ $set: { done: { $not: ["$done"] } } }];
  const doc = await TaskModel.findByIdAndUpdate(id, flip, { updatePipeline: true }).lean();
  return doc !== null;
}

/** false = the task does not exist (maybe deleted in another tab). */
export async function removeTask(id: string): Promise<boolean> {
  await connectDb();
  const doc = await TaskModel.findByIdAndDelete(id).lean();
  return doc !== null;
}
