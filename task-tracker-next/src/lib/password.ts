import "server-only";
import bcrypt from "bcryptjs";
import { PASSWORD_MAX_BYTES, byteLength } from "@/lib/passwordRules";

export const BCRYPT_COST = 12;

// A real cost-12 hash of a random value that was thrown away. It is a constant so the very
// first unknown-email login takes as long as any other (nothing has to be hashed first).
export const DUMMY_HASH = "$2b$12$T5e1IF2lc102agfyEMSQEuS/s00hvK0pFPGQKXLpEc/qX0pa9tiJy";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * `hash` is null when there is no such user: a compare still runs, so the response time does
 * not show whether the email exists. A password over 72 bytes never matches, because bcrypt
 * would ignore everything after byte 72.
 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return matches && hash !== null && byteLength(password) <= PASSWORD_MAX_BYTES;
}
