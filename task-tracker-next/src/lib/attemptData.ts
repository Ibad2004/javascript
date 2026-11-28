import "server-only";
import { connectDb } from "@/lib/db";
import { isDuplicateKey } from "@/lib/duplicateKey";
import { LoginAttemptModel } from "@/models/LoginAttempt";

/**
 * Adds one attempt to `key` and returns the new count, all in one database step, so
 * requests on different servers cannot read the same old number.
 *
 * The window starts at the first attempt and is never extended. The TTL index removes old
 * counters only about once a minute, so an expired one still found here starts again at 1.
 * The count stops at `max + 1` ("blocked").
 */
export async function countAttempt(key: string, max: number, windowMs: number): Promise<number> {
  await connectDb();
  await LoginAttemptModel.init(); // waits for the unique and TTL indexes

  const now = new Date();
  const open = { $gt: ["$expiresAt", now] }; // false for a new counter too
  const update = [
    {
      $set: {
        count: { $cond: [open, { $min: [{ $add: ["$count", 1] }, max + 1] }, 1] },
        expiresAt: { $cond: [open, "$expiresAt", new Date(now.getTime() + windowMs)] },
      },
    },
  ];
  const run = () =>
    LoginAttemptModel.findOneAndUpdate({ key }, update, { upsert: true, returnDocument: "after", updatePipeline: true })
      .orFail()
      .lean();

  try {
    return (await run()).count;
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    return (await run()).count; // another request created the counter at the same moment
  }
}

export async function deleteAttempts(key: string): Promise<void> {
  await connectDb();
  await LoginAttemptModel.deleteOne({ key });
}
