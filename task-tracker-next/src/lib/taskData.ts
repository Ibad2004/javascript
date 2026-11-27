import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db";
import type { Filters, StatusFilter } from "@/lib/filters";
import { buildTaskQuery, isObjectIdString, ownedTask, serializeTask } from "@/lib/taskQuery";
import { sortTasks } from "@/lib/tasks";
import { TaskModel } from "@/models/Task";
import type { Task, TaskInput } from "@/types";

// Every query is limited to one owner. `ownerId` must come from the session, never from the browser.

/** This user's tasks that match the filters (filtered in the database), in the app's usual order. */
export async function getTasks(ownerId: string, filters: Filters): Promise<Task[]> {
  await connectDb();
  const docs = await TaskModel.find(buildTaskQuery(ownerId, filters)).lean();
  return sortTasks(docs.map(serializeTask));
}

/** Counts over all of this user's tasks, for the status buttons and the summary. */
export async function getTaskCounts(ownerId: string): Promise<Record<StatusFilter, number>> {
  await connectDb();
  const [all, done] = await Promise.all([TaskModel.countDocuments({ owner: ownerId }), TaskModel.countDocuments({ owner: ownerId, done: true })]);
  return { all, done, pending: all - done };
}

/** null for an invalid id ("bad-id"), a missing task or someone else's. cache() = one query per request. */
export const getTaskById = cache(async (ownerId: string, id: string): Promise<Task | null> => {
  if (!isObjectIdString(id)) return null;
  await connectDb();
  const doc = await TaskModel.findOne(ownedTask(ownerId, id)).lean();
  return doc === null ? null : serializeTask(doc);
});

// Writes. The callers (server actions) validate the input and the id first.

/** Returns the new task's id. */
export async function insertTask(ownerId: string, input: TaskInput): Promise<string> {
  await connectDb();
  const doc = await TaskModel.create({ ...input, done: false, owner: ownerId });
  return doc._id.toString();
}

/** Changes only the four edited fields, so `done` is kept. false = no such task of this user. */
export async function saveTask(ownerId: string, id: string, input: TaskInput): Promise<boolean> {
  await connectDb();
  const { title, description, priority, dueDate } = input;
  const doc = await TaskModel.findOneAndUpdate(ownedTask(ownerId, id), { $set: { title, description, priority, dueDate } }).lean();
  return doc !== null;
}

/** Flips `done` in one database step (no read-then-write). false = no such task of this user. */
export async function toggleTaskDone(ownerId: string, id: string): Promise<boolean> {
  await connectDb();
  const flip = [{ $set: { done: { $not: ["$done"] } } }];
  const doc = await TaskModel.findOneAndUpdate(ownedTask(ownerId, id), flip, { updatePipeline: true }).lean();
  return doc !== null;
}

/** false = no such task of this user (maybe deleted in another tab). */
export async function removeTask(ownerId: string, id: string): Promise<boolean> {
  await connectDb();
  const doc = await TaskModel.findOneAndDelete(ownedTask(ownerId, id)).lean();
  return doc !== null;
}
