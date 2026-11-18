import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError } from "./errors.js";

export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export const requireDb: RequestHandler = (_req, _res, next) => {
  if (!isDbConnected()) throw new ApiError(503, "Database unavailable, try again shortly");
  next();
};
