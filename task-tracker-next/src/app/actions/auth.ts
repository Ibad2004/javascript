"use server";
// Sign up, log in, log out. Anyone can call these with any data.

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { AUTH_MESSAGES, type AuthState } from "@/lib/authResult";
import { loginSchema, parseCredentials, signupSchema } from "@/lib/authSchema";
import { clientIp } from "@/lib/clientIp";
import { clearLoginAttempts, tryLoginAttempt, trySignupAttempt } from "@/lib/loginLimiter";
import { hashPassword, verifyPassword } from "@/lib/password";
import { safeNextPath } from "@/lib/safeNext";
import { createSession, deleteSession } from "@/lib/session";
import { getSessionKey } from "@/lib/sessionToken";
import { findLoginByEmail, insertUser } from "@/lib/userData";

function readForm(formData: unknown) {
  const form = formData instanceof FormData ? formData : new FormData();
  const typed = form.get("email");
  return {
    raw: { email: typed, password: form.get("password") },
    email: typeof typed === "string" ? typed.slice(0, 254) : "",
    next: form.get("next"),
  };
}

/** Only the error's name is logged: no database message, host or password reaches a log or the browser. */
function failed(error: unknown, email: string): AuthState {
  unstable_rethrow(error);
  console.error("Auth action failed:", error instanceof Error ? error.name : "unknown error");
  return { message: AUTH_MESSAGES.failed, email };
}

async function requestIp(): Promise<string> {
  return clientIp((await headers()).get("x-forwarded-for"));
}

export async function signup(_previous: AuthState, formData: unknown): Promise<AuthState> {
  const { raw, email, next } = readForm(formData);
  const parsed = parseCredentials(signupSchema, raw);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, email };

  getSessionKey(); // fail clearly BEFORE an account is created that could not be logged in
  try {
    // Counted before hashing: it also limits bcrypt work and guessing which emails exist.
    if (!(await trySignupAttempt(await requestIp()))) return { message: AUTH_MESSAGES.tooManySignups, email };
    const userId = await insertUser(parsed.data.email, await hashPassword(parsed.data.password));
    if (userId === null) return { fieldErrors: { email: AUTH_MESSAGES.emailTaken }, email };
    await createSession(userId);
  } catch (error) {
    return failed(error, email);
  }
  // Outside try: redirect() works by throwing.
  redirect(safeNextPath(next));
}

export async function login(_previous: AuthState, formData: unknown): Promise<AuthState> {
  const { raw, email, next } = readForm(formData);
  const parsed = parseCredentials(loginSchema, raw);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, email };

  getSessionKey();
  try {
    const ip = await requestIp();
    if (!(await tryLoginAttempt(parsed.data.email, ip))) return { message: AUTH_MESSAGES.tooManyAttempts, email };
    const user = await findLoginByEmail(parsed.data.email);
    // Always compares (with a dummy hash for an unknown email), and gives one message for both cases.
    const matches = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
    if (user === null || !matches) return { message: AUTH_MESSAGES.wrongCredentials, email };
    await clearLoginAttempts(parsed.data.email, ip);
    await createSession(user.id);
  } catch (error) {
    return failed(error, email);
  }
  redirect(safeNextPath(next));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
