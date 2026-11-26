// What every server action answers with. No server-only code here: the browser uses it too.
import type { TaskValidation } from "@/lib/tasks";

/** The same shape the form already shows, plus priority (only a hand-made request can break it). */
export type FieldErrors = TaskValidation["errors"] & { priority?: string };

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export const ACTION_MESSAGES = {
  invalid: "Please fix the errors in the form.",
  gone: "This task no longer exists.",
  failed: "Could not save your change. Please try again.",
} as const;

export const succeeded = (): ActionResult => ({ ok: true });

export const invalidInput = (fieldErrors: FieldErrors): ActionResult => ({
  ok: false,
  message: ACTION_MESSAGES.invalid,
  fieldErrors,
});

export const taskGone = (): ActionResult => ({ ok: false, message: ACTION_MESSAGES.gone });

export const saveFailed = (): ActionResult => ({ ok: false, message: ACTION_MESSAGES.failed });

/**
 * Runs database work. Any error becomes the same friendly result, so no database message,
 * host name or stack trace reaches the browser. Only the error's name is logged.
 */
export async function runSafely(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await work();
  } catch (error) {
    console.error("Task action failed:", error instanceof Error ? error.name : "unknown error");
    return saveFailed();
  }
}
