import type { ErrorRequestHandler, RequestHandler } from "express";
import { ApiError } from "./errors.js";

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
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
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
