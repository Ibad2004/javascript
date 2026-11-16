import { ApiError } from "./errors.js";
import type { Priority, TaskInput, TaskPatch } from "./types.js";

const PRIORITIES: readonly string[] = ["low", "medium", "high"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Without a JSON body (or with a non-JSON content type) Express 5 leaves req.body undefined. */
function readBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) throw new ApiError(400, "Send the task as JSON");
  return body;
}

function title(value: unknown): string {
  if (typeof value !== "string") throw new ApiError(400, "title must be a string");
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new ApiError(400, "title must be 1 to 100 characters");
  }
  return trimmed;
}

function description(value: unknown): string {
  if (typeof value !== "string") throw new ApiError(400, "description must be a string");
  if (value.length > 500) throw new ApiError(400, "description must be at most 500 characters");
  return value;
}

function priority(value: unknown): Priority {
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new ApiError(400, `priority must be one of: ${PRIORITIES.join(", ")}`);
}

function dueDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, 'dueDate must be null or a date like "2026-12-31"');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, "dueDate must be a real calendar date");
  }
  return value;
}

function done(value: unknown): boolean {
  if (typeof value !== "boolean") throw new ApiError(400, "done must be true or false");
  return value;
}

export function parseNewTask(body: unknown): TaskInput {
  const data = readBody(body);
  return {
    title: title(data["title"]),
    description: data["description"] === undefined ? "" : description(data["description"]),
    priority: data["priority"] === undefined ? "medium" : priority(data["priority"]),
    dueDate: data["dueDate"] === undefined ? null : dueDate(data["dueDate"]),
  };
}

export function parsePatch(body: unknown): TaskPatch {
  const data = readBody(body);
  const patch: TaskPatch = {};
  if (data["title"] !== undefined) patch.title = title(data["title"]);
  if (data["description"] !== undefined) patch.description = description(data["description"]);
  if (data["priority"] !== undefined) patch.priority = priority(data["priority"]);
  if (data["dueDate"] !== undefined) patch.dueDate = dueDate(data["dueDate"]);
  if (data["done"] !== undefined) patch.done = done(data["done"]);
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, "Send at least one of: title, description, priority, dueDate, done");
  }
  return patch;
}
