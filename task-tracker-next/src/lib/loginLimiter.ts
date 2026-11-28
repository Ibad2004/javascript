// Limits on logins and sign-ups. The counters are in MongoDB, so they are shared by all
// server instances and survive a restart.
import "server-only";
import { countAttempt, deleteAttempts } from "@/lib/attemptData";

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_SIGNUPS = 10;
export const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

// Email AND address: a stranger on another network cannot lock this person out.
const loginKey = (email: string, ip: string) => `login:${email}|${ip}`;
const signupKey = (ip: string) => `signup:${ip}`;

/**
 * false = blocked. Otherwise the attempt is counted BEFORE the password is checked, so
 * many requests sent at the same moment cannot all get past the limit. A correct
 * password calls clearLoginAttempts(). `email` must already be trimmed and lowercased.
 */
export async function tryLoginAttempt(email: string, ip: string): Promise<boolean> {
  return (await countAttempt(loginKey(email, ip), MAX_FAILURES, WINDOW_MS)) <= MAX_FAILURES;
}

export async function clearLoginAttempts(email: string, ip: string): Promise<void> {
  await deleteAttempts(loginKey(email, ip));
}

/** false = this address has used up its sign-ups for the hour. */
export async function trySignupAttempt(ip: string): Promise<boolean> {
  return (await countAttempt(signupKey(ip), MAX_SIGNUPS, SIGNUP_WINDOW_MS)) <= MAX_SIGNUPS;
}
