import "server-only";
import { z } from "zod";
import { AUTH_MESSAGES, type AuthFieldErrors } from "@/lib/authResult";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN, byteLength } from "@/lib/passwordRules";
import { countChars } from "@/lib/tasks";

const EMAIL_MAX = 254;

const email = z
  .string({ error: AUTH_MESSAGES.invalidEmail })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: AUTH_MESSAGES.invalidEmail }).max(EMAIL_MAX, { error: AUTH_MESSAGES.invalidEmail }));

// The password is never trimmed or changed: what the user typed is what gets hashed.
export const signupSchema = z.object({
  email,
  password: z
    .string({ error: AUTH_MESSAGES.passwordRequired })
    .refine((value) => countChars(value) >= PASSWORD_MIN, { error: AUTH_MESSAGES.passwordTooShort })
    .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, { error: AUTH_MESSAGES.passwordTooLong })
    .refine((value) => value.trim() !== "", { error: AUTH_MESSAGES.passwordBlank }),
});

/** Login does not repeat the signup rules: a wrong password is just "incorrect". */
export const loginSchema = z.object({
  email,
  password: z.string({ error: AUTH_MESSAGES.passwordRequired }).min(1, { error: AUTH_MESSAGES.passwordRequired }),
});

export type Credentials = { email: string; password: string };

export type ParsedCredentials = { ok: true; data: Credentials } | { ok: false; fieldErrors: AuthFieldErrors };

export function parseCredentials(schema: typeof signupSchema | typeof loginSchema, raw: unknown): ParsedCredentials {
  const result = schema.safeParse(typeof raw === "object" && raw !== null ? raw : {});
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: AuthFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field === "email" || field === "password") fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
