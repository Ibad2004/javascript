import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import { addDays, toLocalDateString } from "../src/lib/dates";
import { BCRYPT_COST, hashPassword } from "../src/lib/password";
import { SEED_DB, isSeedableDatabase } from "../src/lib/seedGuard";
import type { TaskInput } from "../src/types";
import { TaskModel } from "../src/models/Task";
import { UserModel } from "../src/models/User";

// A public demo account for local testing, printed in the README. Never a real password.
const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "DemoPass123";

async function main(): Promise<void> {
  await connectDb();
  const name = mongoose.connection.name;
  if (!isSeedableDatabase(name)) {
    console.error(`Aborting: connected to database "${name}", expected "${SEED_DB}". Nothing was deleted.`);
    process.exitCode = 1;
    return;
  }

  const today = toLocalDateString(new Date());
  const t = (offset: number) => addDays(today, offset);
  const tasks: (TaskInput & { done: boolean })[] = [
    { title: "Finish the Week 5 reading", description: "Routing, layouts and server components.", done: false, priority: "high", dueDate: t(-2) },
    { title: "Buy groceries", description: "Milk, eggs, bread.", done: false, priority: "medium", dueDate: t(0) },
    { title: "Write the status meeting notes", description: "Which components are client and why.", done: false, priority: "high", dueDate: t(1) },
    { title: "Call the dentist", description: "", done: false, priority: "low", dueDate: t(5) },
    { title: "Learn C++ templates", description: "Chapter 3 exercises.", done: false, priority: "medium", dueDate: null },
    { title: "اردو کی کتاب پڑھنا", description: "ہفتے میں دو باب۔", done: false, priority: "low", dueDate: t(3) },
    { title: "Submit the Week 4 project", description: "URL shortener, parts 1 and 2.", done: true, priority: "high", dueDate: t(-4) },
    { title: "Plan the weekend trip with a really long title that keeps going to check wrapping on a 320px screen", description: "", done: true, priority: "low", dueDate: null },
  ];

  await Promise.all([UserModel.init(), TaskModel.init()]); // creates the indexes
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const demo = await UserModel.findOneAndUpdate(
    { email: DEMO_EMAIL },
    { $set: { passwordHash } },
    { upsert: true, returnDocument: "after" },
  ).orFail();

  // Only the demo user's tasks and old tasks from before Day 24 (no owner). Other users keep theirs.
  const removed = await TaskModel.deleteMany({ $or: [{ owner: demo._id }, { owner: { $exists: false } }] });
  const inserted = await TaskModel.insertMany(tasks.map((task) => ({ ...task, owner: demo._id })));
  console.log(`Seeded "${name}": deleted ${removed.deletedCount}, inserted ${inserted.length} for ${DEMO_EMAIL} (bcrypt cost ${BCRYPT_COST}).`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
