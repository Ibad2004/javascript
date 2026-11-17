import { Router, type RequestHandler } from "express";
import { isDbConnected } from "./db.js";
import { ApiError } from "./errors.js";
import { Task } from "./models/Task.js";
import { parseNewTask, parsePatch } from "./validate.js";

export const tasksRouter = Router();

const requireDb: RequestHandler = (_req, _res, next) => {
  if (!isDbConnected()) throw new ApiError(503, "Database unavailable, try again shortly");
  next();
};
tasksRouter.use(requireDb);

function notFound(): ApiError {
  return new ApiError(404, "Task not found");
}

function checkId(id: string): void {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw notFound();
}

tasksRouter.get("/", async (_req, res) => {
  res.json(await Task.find().sort({ createdAt: 1 }));
});

tasksRouter.get("/:id", async (req, res) => {
  checkId(req.params.id);
  const task = await Task.findById(req.params.id);
  if (task === null) throw notFound();
  res.json(task);
});

tasksRouter.post("/", async (req, res) => {
  const task = await Task.create(parseNewTask(req.body));
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const patch = parsePatch(req.body);
  checkId(req.params.id);
  const task = await Task.findByIdAndUpdate(req.params.id, patch, { runValidators: true, returnDocument: "after" });
  if (task === null) throw notFound();
  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  checkId(req.params.id);
  if ((await Task.findByIdAndDelete(req.params.id)) === null) throw notFound();
  res.status(204).end();
});
