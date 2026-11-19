import { z } from "zod";
import { ValidationError, ApiError } from "./errors.js";

const title = z.string({ error: "title must be a string" }).trim().min(1, "title must be 1 to 100 characters").max(100, "title must be 1 to 100 characters");
const description = z.string({ error: "description must be a string" }).max(500, "description must be at most 500 characters");
const priority = z.enum(["low", "medium", "high"], { error: "priority must be one of: low, medium, high" });
const dueDate = z
  .string({ error: 'dueDate must be null or a date like "2026-12-31"' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be null or a date like "2026-12-31"')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; // Zod also runs this when the regex failed
  }, "dueDate must be a real calendar date")
  .nullable();
const tags = z
  .array(z.string({ error: "tags must be an array of strings" }).trim().min(1, "tags must be 1 to 20 characters each").max(20, "tags must be 1 to 20 characters each"), {
    error: "tags must be an array of strings",
  })
  .transform((list) => [...new Set(list)])
  .refine((list) => list.length <= 10, "tags can have at most 10 items");
const done = z.boolean({ error: "done must be true or false" });

// Zod strips unknown keys, so `owner`, `id` and the like never get through.
export const newTaskSchema = z.object({
  title,
  description: description.default(""),
  priority: priority.default("medium"),
  dueDate: dueDate.default(null),
  tags: tags.default([]),
});

export const patchSchema = z
  .object({ title, description, priority, dueDate, tags, done })
  .partial()
  .refine((p) => Object.values(p).some((v) => v !== undefined), "Send at least one of: title, description, priority, dueDate, tags, done");

export const signupSchema = z.object({
  email: z.string({ error: "email must be a string" }).trim().toLowerCase().pipe(z.email("email must be a valid email")),
  password: z
    .string({ error: "password must be a string" })
    .min(8, "password must be 8 to 72 characters")
    .max(72, "password must be 8 to 72 characters")
    // bcrypt only reads the first 72 BYTES, so reject longer multi-byte passwords too.
    .refine((v) => Buffer.byteLength(v) <= 72, "password must be 8 to 72 characters"),
});

export const loginSchema = z.object({
  email: z.string({ error: "email must be a string" }).trim().toLowerCase().min(1, "email is required"),
  password: z.string({ error: "password must be a string" }).min(1, "password is required"),
});

export function parseBody<T extends z.ZodType>(schema: T, body: unknown, what = "data"): z.output<T> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new ApiError(400, `Send the ${what} as JSON`);
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "body");
    fields[key] ??= issue.message;
  }
  throw new ValidationError(result.error.issues[0]?.message ?? "Invalid data", fields);
}

const zones = new Set<string>([...Intl.supportedValuesOf("timeZone"), "UTC"]);
export const statsQuerySchema = z.object({
  tz: z
    .string({ error: "tz must be an IANA time zone like Asia/Karachi" })
    .refine((v) => zones.has(v), "tz must be an IANA time zone like Asia/Karachi")
    .default("UTC"),
});
