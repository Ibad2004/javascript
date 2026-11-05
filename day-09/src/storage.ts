import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "./config.js";
import { emptyStore, type Expense, type Result, type Store } from "./expenses.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidAmount(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return false;
  }
  const scaled = value * 10 ** config.maxDecimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseExpense(value: unknown, index: number): Result<Expense> {
  const where = `expenses[${index}]`;
  if (!isRecord(value)) {
    return { ok: false, error: `${where} is not an object.` };
  }
  const { id, amount, description, category, date } = value;
  if (!isPositiveInteger(id)) {
    return { ok: false, error: `${where}.id must be a whole number above 0.` };
  }
  if (!isValidAmount(amount)) {
    return { ok: false, error: `${where}.amount must be a positive number with at most 2 decimals.` };
  }
  if (!isFilledString(description)) {
    return { ok: false, error: `${where}.description must be a non-empty string.` };
  }
  if (!isFilledString(category)) {
    return { ok: false, error: `${where}.category must be a non-empty string.` };
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return { ok: false, error: `${where}.date must be an ISO date string.` };
  }
  return { ok: true, value: { id, amount, description, category, date } };
}

export function parseStore(value: unknown): Result<Store> {
  if (!isRecord(value)) {
    return { ok: false, error: "top level must be an object with nextId and expenses." };
  }
  if (!isPositiveInteger(value["nextId"])) {
    return { ok: false, error: "nextId must be a whole number above 0." };
  }
  const list = value["expenses"];
  if (!Array.isArray(list)) {
    return { ok: false, error: "expenses must be an array." };
  }
  const expenses: Expense[] = [];
  const seen = new Set<number>();
  for (const [index, item] of list.entries()) {
    const expense = parseExpense(item, index);
    if (!expense.ok) {
      return expense;
    }
    if (seen.has(expense.value.id)) {
      return { ok: false, error: `duplicate id ${expense.value.id}.` };
    }
    seen.add(expense.value.id);
    expenses.push(expense.value);
  }
  return { ok: true, value: { nextId: value["nextId"], expenses } };
}

function isMissingFile(error: unknown): boolean {
  return isRecord(error) && error["code"] === "ENOENT";
}

export async function loadStore(filePath: string): Promise<Result<Store>> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return { ok: true, value: emptyStore() };
    }
    throw error;
  }
  const problem = `Data file ${filePath} is not valid and was not changed. Fix or remove it.`;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `${problem}\nReason: invalid JSON (${reason}).` };
  }
  const store = parseStore(data);
  if (!store.ok) {
    return { ok: false, error: `${problem}\nReason: ${store.error}` };
  }
  return store;
}

export async function saveStore(filePath: string, store: Store): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(tempFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(tempFile, filePath);
  } catch (error) {
    await rm(tempFile, { force: true });
    throw error;
  }
}
