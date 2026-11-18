import { createApp } from "./app.js";
import { ConfigError, loadJwtConfig } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";

try {
  loadJwtConfig();
} catch (err) {
  console.error(err instanceof ConfigError ? err.message : "Invalid configuration");
  process.exit(1);
}

const uri = process.env["MONGODB_URI"];
if (!uri) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env.");
  process.exit(1);
}

try {
  await connectDb(uri);
} catch {
  console.error("Cannot connect to MongoDB: check the password and that your IP is allowed in Atlas Network Access.");
  process.exit(1);
}
console.log("Connected to MongoDB");

const port = Number(process.env["PORT"] ?? 4000);
const server = createApp().listen(port, () => {
  console.log(`task-api listening on http://localhost:${port}`);
});

let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  server.close();
  await disconnectDb();
  console.log("Database connection closed");
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
