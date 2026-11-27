// The signed token inside the session cookie. No database and no next/headers here, so
// both src/proxy.ts and src/lib/session.ts can use it.
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { isObjectIdString } from "@/lib/taskQuery";

export const SESSION_COOKIE = "session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const SECRET_MIN = 32;

/** Throws a clear error when AUTH_SECRET is missing or weak. The value is never printed. */
export function getSessionKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret === undefined || secret.length < SECRET_MIN) {
    throw new Error(`AUTH_SECRET is missing or shorter than ${SECRET_MIN} characters — see .env.example`);
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string, now: Date = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_SECONDS)
    .sign(getSessionKey());
}

/** The user id, or null for a token that is damaged, changed, expired or signed by someone else. */
export async function verifySessionToken(token: string): Promise<string | null> {
  const key = getSessionKey(); // outside try: a wrong setup must fail loudly, not look "logged out"
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], requiredClaims: ["sub", "exp"] });
    return typeof payload.sub === "string" && isObjectIdString(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}
