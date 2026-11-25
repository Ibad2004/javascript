import "server-only";
import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

declare global {
  // One cache per Node process: dev hot-reload re-runs this module, but globalThis survives.
  var mongooseCache: Cache | undefined;
}

const cache: Cache = globalThis.mongooseCache ?? { conn: null, promise: null };
globalThis.mongooseCache = cache;

mongoose.set("runValidators", true);

/** Connects once and reuses the connection. The URI is never put in an error message. */
export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn !== null) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (uri === undefined || uri === "") {
    throw new Error("MONGODB_URI is not set — see .env.example");
  }

  cache.promise ??= mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 5000 });
  try {
    cache.conn = await cache.promise;
  } catch {
    cache.promise = null; // let the next request try again
    throw new Error("Could not connect to the database");
  }
  return cache.conn;
}
