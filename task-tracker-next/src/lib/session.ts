import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { loginPath } from "@/lib/safeNext";
import { SESSION_COOKIE, SESSION_SECONDS, signSessionToken, verifySessionToken } from "@/lib/sessionToken";
import { findUserById, type SessionUser } from "@/lib/userData";

/** Only in a server action or route handler: cookies cannot be set while a page renders. */
export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript in the page cannot read it
    sameSite: "lax", // not sent with POSTs coming from other sites
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The logged-in user, or null (no cookie, bad or expired token, or the account is gone).
 * A database error is NOT "logged out": it is thrown. cache() = one lookup per page render.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token === undefined) return null;
  const userId = await verifySessionToken(token);
  return userId === null ? null : findUserById(userId);
});

/** For server actions. Sends a logged-out caller to /login; nothing after it runs. */
export async function requireUser(): Promise<SessionUser> {
  return (await getCurrentUser()) ?? redirect("/login");
}

/** For pages: like requireUser, and comes back to `path` after logging in. */
export async function requirePageUser(path: string): Promise<SessionUser> {
  return (await getCurrentUser()) ?? redirect(loginPath(path));
}
