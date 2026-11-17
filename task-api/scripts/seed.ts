import { connectDb, disconnectDb } from "../src/db.js";
import { Task } from "../src/models/Task.js";
import { sampleTasks } from "../src/sampleTasks.js";

const uri = process.env["MONGODB_URI"];
if (!uri) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env.");
  process.exit(1);
}
try {
  await connectDb(uri);
  if ((await Task.countDocuments()) > 0) {
    console.log("Collection is not empty, nothing inserted.");
  } else {
    await Task.insertMany(sampleTasks);
    console.log(`Inserted ${sampleTasks.length} sample tasks.`);
  }
  await disconnectDb();
} catch {
  console.error("Seed failed. Check the password and that your IP is allowed in Atlas Network Access.");
  process.exit(1);
}
