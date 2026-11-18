import { Router } from "express";
import { requireAuth } from "./auth.js";
import { requireDb } from "./db.js";
import { ApiError } from "./errors.js";
import { Task } from "./models/Task.js";
import { newTaskSchema, parseBody, patchSchema } from "./validate.js";

export const tasksRouter = Router();
tasksRouter.use(requireDb, requireAuth);

function notFound(): ApiError {
  return new ApiError(404, "Task not found");
}

function checkId(id: string): void {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw notFound();
}

// Every query has `owner`: another user's task looks exactly like a missing one (404).
tasksRouter.get("/", async (req, res) => {
  res.json(await Task.find({ owner: req.userId }).sort({ createdAt: 1 }));
});

tasksRouter.get("/:id", async (req, res) => {
  checkId(req.params.id);
  const task = await Task.findOne({ _id: req.params.id, owner: req.userId });
  if (task === null) throw notFound();
  res.json(task);
});

tasksRouter.post("/", async (req, res) => {
  const task = await Task.create({ ...parseBody(newTaskSchema, req.body, "task"), owner: req.userId });
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const patch = parseBody(patchSchema, req.body, "task");
  checkId(req.params.id);
  const task = await Task.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, patch, { runValidators: true, returnDocument: "after" });
  if (task === null) throw notFound();
  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  checkId(req.params.id);
  if ((await Task.findOneAndDelete({ _id: req.params.id, owner: req.userId })) === null) throw notFound();
  res.status(204).end();
});
