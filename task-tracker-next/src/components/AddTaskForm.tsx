"use client";
// Client: passes the create action to the form (a function that runs in the browser).
import { createTask } from "@/app/actions/tasks";
import { TaskForm } from "@/components/TaskForm";

export function AddTaskForm() {
  return <TaskForm mode="add" submitLabel="Add task" onSave={createTask} />;
}
