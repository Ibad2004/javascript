import "server-only";
import { connectDb } from "@/lib/db";
import { isDuplicateKey } from "@/lib/duplicateKey";
import { isObjectIdString } from "@/lib/taskQuery";
import { UserModel } from "@/models/User";

/** What the app knows about the logged-in user. The password hash is not part of it. */
export type SessionUser = { id: string; email: string };

export async function findUserById(id: string): Promise<SessionUser | null> {
  if (!isObjectIdString(id)) return null;
  await connectDb();
  const doc = await UserModel.findById(id).select("email").lean();
  return doc === null ? null : { id: doc._id.toString(), email: doc.email };
}

/** For login only. `email` must already be trimmed and lowercased (the schema does that). */
export async function findLoginByEmail(email: string): Promise<{ id: string; passwordHash: string } | null> {
  await connectDb();
  const doc = await UserModel.findOne({ email }).select("passwordHash").lean();
  return doc === null ? null : { id: doc._id.toString(), passwordHash: doc.passwordHash };
}

/** Returns the new user's id, or null when the email is already registered. */
export async function insertUser(email: string, passwordHash: string): Promise<string | null> {
  await connectDb();
  // Waits for the unique index: it, not a "does it exist?" query, is what stops two equal emails.
  await UserModel.init();
  try {
    const doc = await UserModel.create({ email, passwordHash });
    return doc._id.toString();
  } catch (error) {
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}
