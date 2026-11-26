import "server-only";
import { z } from "zod";
import type { FieldErrors } from "@/lib/actionResult";
import { DESCRIPTION_MAX, MESSAGES, TITLE_MAX, countChars, isValidDueDate } from "@/lib/tasks";
import type { TaskInput } from "@/types";

/**
 * The server's own check of a task. The browser is never trusted: an action can be called
 * with any data. Unknown extra fields (like `done` or `_id`) are dropped by z.object.
 * Lengths are counted like in the form (countChars: one emoji is one character).
 */
export const taskInputSchema = z.object({
  title: z
    .string({ error: MESSAGES.titleRequired })
    .trim()
    .min(1, { error: MESSAGES.titleRequired })
    .refine((value) => countChars(value) <= TITLE_MAX, { error: MESSAGES.titleTooLong }),
  description: z
    .string({ error: MESSAGES.invalidDescription })
    .trim()
    .refine((value) => countChars(value) <= DESCRIPTION_MAX, { error: MESSAGES.descriptionTooLong }),
  priority: z.enum(["low", "medium", "high"], { error: MESSAGES.invalidPriority }),
  dueDate: z
    .string({ error: MESSAGES.invalidDate })
    .trim()
    .refine((value) => value === "" || isValidDueDate(value), { error: MESSAGES.invalidDate })
    .transform((value) => (value === "" ? null : value)),
});

export type ParsedTaskInput = { ok: true; data: TaskInput } | { ok: false; fieldErrors: FieldErrors };

const FIELDS = ["title", "description", "priority", "dueDate"] as const;

/** Validates untrusted data. The first message of each field is kept, as the form shows one. */
export function parseTaskInput(raw: unknown): ParsedTaskInput {
  // Something that is not an object at all is treated like an empty form.
  const result = taskInputSchema.safeParse(typeof raw === "object" && raw !== null ? raw : {});
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = FIELDS.find((name) => name === issue.path[0]);
    if (field !== undefined) fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
