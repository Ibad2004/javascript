import { Router } from "express";
import { ApiError } from "./errors.js";
import * as store from "./store.js";
import { parseNewTask, parsePatch } from "./validate.js";

export const tasksRouter = Router();

function notFound(id: string): ApiError {
  return new ApiError(404, `Task ${id} not found`);
}

tasksRouter.get("/", (_req, res) => {
  res.json(store.listTasks());
});

tasksRouter.get("/:id", (req, res) => {
  const task = store.getTask(req.params.id);
  if (task === undefined) throw notFound(req.params.id);
  res.json(task);
});

tasksRouter.post("/", (req, res) => {
  const task = store.createTask(parseNewTask(req.body));
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

tasksRouter.patch("/:id", (req, res) => {
  const patch = parsePatch(req.body);
  const task = store.updateTask(req.params.id, patch);
  if (task === undefined) throw notFound(req.params.id);
  res.json(task);
});

tasksRouter.delete("/:id", (req, res) => {
  if (!store.deleteTask(req.params.id)) throw notFound(req.params.id);
  res.status(204).end();
});
