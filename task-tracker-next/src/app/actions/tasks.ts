"use server";
// Server actions: anyone can call these with any data, so every argument is `unknown` and checked here.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invalidInput, runSafely, succeeded, taskGone, type ActionResult } from "@/lib/actionResult";
import { insertTask, removeTask, saveTask, toggleTaskDone } from "@/lib/taskData";
import { isObjectIdString } from "@/lib/taskQuery";
import { parseTaskInput } from "@/lib/taskSchema";

function isTaskId(id: unknown): id is string {
  return typeof id === "string" && isObjectIdString(id);
}

function revalidateTask(id: string): void {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const parsed = parseTaskInput(input);
  if (!parsed.ok) return invalidInput(parsed.fieldErrors);

  return runSafely(async () => {
    revalidateTask(await insertTask(parsed.data));
    return succeeded();
  });
}

export async function updateTask(id: unknown, input: unknown): Promise<ActionResult> {
  if (!isTaskId(id)) return taskGone();
  const parsed = parseTaskInput(input);
  if (!parsed.ok) return invalidInput(parsed.fieldErrors);

  return runSafely(async () => {
    if (!(await saveTask(id, parsed.data))) return taskGone();
    revalidateTask(id);
    return succeeded();
  });
}

export async function toggleTask(id: unknown): Promise<ActionResult> {
  if (!isTaskId(id)) return taskGone();

  return runSafely(async () => {
    if (!(await toggleTaskDone(id))) return taskGone();
    revalidateTask(id);
    return succeeded();
  });
}

/** `redirectToList` is a yes/no, not a URL, so a caller can never choose where we redirect. */
export async function deleteTask(id: unknown, redirectToList?: unknown): Promise<ActionResult> {
  if (!isTaskId(id)) return taskGone();

  const result = await runSafely(async () => {
    if (!(await removeTask(id))) return taskGone();
    revalidateTask(id);
    return succeeded();
  });
  // Outside runSafely: redirect() works by throwing, and that must not be caught.
  if (result.ok && redirectToList === true) redirect("/tasks");
  return result;
}
