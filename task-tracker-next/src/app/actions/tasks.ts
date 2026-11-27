"use server";
// Server actions: anyone can call these with any data, so every argument is `unknown` and checked here.
// Every action calls requireUser() itself; src/proxy.ts is not relied on.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invalidInput, runSafely, succeeded, taskGone, type ActionResult } from "@/lib/actionResult";
import { requireUser } from "@/lib/session";
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
  return runSafely(async () => {
    const user = await requireUser();
    const parsed = parseTaskInput(input);
    if (!parsed.ok) return invalidInput(parsed.fieldErrors);

    revalidateTask(await insertTask(user.id, parsed.data));
    return succeeded();
  });
}

export async function updateTask(id: unknown, input: unknown): Promise<ActionResult> {
  return runSafely(async () => {
    const user = await requireUser();
    if (!isTaskId(id)) return taskGone();
    const parsed = parseTaskInput(input);
    if (!parsed.ok) return invalidInput(parsed.fieldErrors);

    if (!(await saveTask(user.id, id, parsed.data))) return taskGone();
    revalidateTask(id);
    return succeeded();
  });
}

export async function toggleTask(id: unknown): Promise<ActionResult> {
  return runSafely(async () => {
    const user = await requireUser();
    if (!isTaskId(id)) return taskGone();

    if (!(await toggleTaskDone(user.id, id))) return taskGone();
    revalidateTask(id);
    return succeeded();
  });
}

/** `redirectToList` is a yes/no, not a URL, so a caller can never choose where we redirect. */
export async function deleteTask(id: unknown, redirectToList?: unknown): Promise<ActionResult> {
  const result = await runSafely(async () => {
    const user = await requireUser();
    if (!isTaskId(id)) return taskGone();

    if (!(await removeTask(user.id, id))) return taskGone();
    revalidateTask(id);
    return succeeded();
  });
  // Outside runSafely: redirect() works by throwing, and that must not be caught.
  if (result.ok && redirectToList === true) redirect("/tasks");
  return result;
}
