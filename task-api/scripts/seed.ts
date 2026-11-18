import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../src/db.js";
import { BCRYPT_COST } from "../src/auth.js";
import { Task } from "../src/models/Task.js";
import { User } from "../src/models/User.js";
import { sampleTasks } from "../src/sampleTasks.js";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "DemoPass123"; // local demo only, never use it anywhere real

const uri = process.env["MONGODB_URI"];
if (!uri) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env.");
  process.exit(1);
}
try {
  await connectDb(uri);
  const demo =
    (await User.findOne({ email: DEMO_EMAIL })) ??
    (await User.create({ email: DEMO_EMAIL, passwordHash: await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST) }));
  // One-time fix for Day 17 tasks: no owner yet, so the demo user gets them. Nothing is deleted.
  const fixed = await Task.updateMany({ $or: [{ owner: { $exists: false } }, { owner: null }] }, { $set: { owner: demo._id } });
  console.log(`Demo user ready. Tasks given an owner: ${fixed.modifiedCount}.`);
  if ((await Task.countDocuments()) === 0) {
    await Task.insertMany(sampleTasks.map((t) => ({ ...t, owner: demo._id })));
    console.log(`Inserted ${sampleTasks.length} sample tasks.`);
  } else {
    console.log("Tasks already exist, no samples inserted.");
  }
  await disconnectDb();
} catch {
  console.error("Seed failed. Check the password and that your IP is allowed in Atlas Network Access.");
  process.exit(1);
}
