import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError, ValidationError } from "./errors.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  if (process.env["NODE_ENV"] === "test") {
    next();
    return;
  }
  const start = performance.now();
  res.on("finish", () => {
    const ms = Math.round(performance.now() - start);
    console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
};

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

/** body-parser errors carry a `type` such as "entity.parse.failed" or "entity.too.large". */
function bodyParserType(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "type" in err && typeof err.type === "string") {
    return err.type;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, fields: err.fields });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json(err.code ? { error: err.message, code: err.code } : { error: err.message });
    return;
  }
  if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
    // The only unique index is User.email.
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const first = Object.values(err.errors)[0];
    res.status(400).json({ error: first?.message ?? "Invalid task" });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `${err.path} has an invalid value` });
    return;
  }
  if (err instanceof mongoose.Error.MongooseServerSelectionError || (err instanceof Error && err.name.startsWith("MongoNetwork"))) {
    res.status(503).json({ error: "Database unavailable, try again shortly" });
    return;
  }
  const type = bodyParserType(err);
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "The body must be valid JSON" });
    return;
  }
  if (type === "entity.too.large") {
    res.status(413).json({ error: "The body is too large (max 10kb)" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
