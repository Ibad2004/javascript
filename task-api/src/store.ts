import { randomUUID } from "node:crypto";
import type { Task, TaskInput, TaskPatch } from "./types.js";

function seed(): Task[] {
  return [
    { id: "1", title: "Learn Express routing", description: "Routes, params, status codes", done: true, priority: "high", dueDate: "2026-11-16" },
    { id: "2", title: "Write the middleware order", description: "For the status meeting", done: false, priority: "medium", dueDate: null },
    { id: "3", title: "Connect the React app", description: "Day 20", done: false, priority: "low", dueDate: "2026-11-20" },
  ];
}

let tasks: Task[] = seed();

export function resetStore(): void {
  tasks = seed();
}

export function listTasks(): Task[] {
  return tasks;
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function createTask(input: TaskInput): Task {
  const task: Task = { id: randomUUID(), done: false, ...input };
  tasks.push(task);
  return task;
}

export function updateTask(id: string, patch: TaskPatch): Task | undefined {
  const index = tasks.findIndex((t) => t.id === id);
  const current = tasks[index];
  if (current === undefined) return undefined;
  const updated: Task = { ...current, ...patch, id: current.id };
  tasks[index] = updated;
  return updated;
}

export function deleteTask(id: string): boolean {
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  return tasks.length < before;
}
