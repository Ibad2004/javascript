import { addDays, toLocalDateString } from "@/lib/dates";
import type { Task } from "@/types";

/** Static sample data for Day 21 (MongoDB replaces it on Day 22). Due dates are relative to the local today. */
export function getSampleTasks(now: Date = new Date()): Task[] {
  const today = toLocalDateString(now);
  const t = (offset: number) => addDays(today, offset);
  return [
    { id: "1", title: "Finish the Week 5 reading", description: "Routing, layouts and server components.", done: false, priority: "high", dueDate: t(-2) },
    { id: "2", title: "Buy groceries", description: "Milk, eggs, bread.", done: false, priority: "medium", dueDate: t(0) },
    { id: "3", title: "Write the status meeting notes", description: "Which components are client and why.", done: false, priority: "high", dueDate: t(1) },
    { id: "4", title: "Call the dentist", description: "", done: false, priority: "low", dueDate: t(5) },
    { id: "5", title: "Learn C++ templates", description: "Chapter 3 exercises.", done: false, priority: "medium", dueDate: null },
    { id: "6", title: "اردو کی کتاب پڑھنا", description: "ہفتے میں دو باب۔", done: false, priority: "low", dueDate: t(3) },
    { id: "7", title: "Submit the Week 4 project", description: "URL shortener, parts 1 and 2.", done: true, priority: "high", dueDate: t(-4) },
    { id: "8", title: "Plan the weekend trip with a really long title that keeps going to check that wrapping works on a 320px screen", description: "", done: true, priority: "low", dueDate: null },
  ];
}

export function findSampleTask(id: string): Task | undefined {
  return getSampleTasks().find((task) => task.id === id);
}
