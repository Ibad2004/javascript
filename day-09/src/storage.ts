import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { dirname } from "node:path";
import { config } from "./config.js";
import { emptyStore, toPaisa, type Expense, type Result, type Store } from "./expenses.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidAmount(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > config.maxAmount) {
    return false;
  }
  const scaled = value * 10 ** config.maxDecimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

function isValidPaisa(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= config.maxAmount * 100;
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseExpense(value: unknown, index: number): Result<Expense> {
  const where = `expenses[${index}]`;
  if (!isRecord(value)) {
    return { ok: false, error: `${where} is not an object.` };
  }
  const { id, amountPaisa, amount, description, category, date } = value;
  if (!isPositiveInteger(id)) {
    return { ok: false, error: `${where}.id must be a whole number above 0.` };
  }
  // New files store whole paisa. Old files stored a decimal "amount"; it is still read.
  let paisa: number;
  if (amountPaisa !== undefined) {
    if (!isValidPaisa(amountPaisa)) {
      return {
        ok: false,
        error: `${where}.amountPaisa must be a whole number of paisa above 0 (up to ${config.maxAmount * 100}).`,
      };
    }
    paisa = amountPaisa;
  } else if (isValidAmount(amount)) {
    paisa = toPaisa(amount);
  } else {
    return {
      ok: false,
      error: `${where}.amountPaisa (whole paisa) or the old ${where}.amount (up to ${config.maxAmount}, at most 2 decimals) is missing or not valid.`,
    };
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
  return { ok: true, value: { id, amountPaisa: paisa, description, category, date } };
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

export async function writeTextSafely(filePath: string, text: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(tempFile, text, "utf8");
    await rename(tempFile, filePath);
  } catch (error) {
    await rm(tempFile, { force: true });
    throw error;
  }
}

export async function saveStore(filePath: string, store: Store): Promise<void> {
  await writeTextSafely(filePath, `${JSON.stringify(store, null, 2)}\n`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isMissingFile(error)) {
      return false;
    }
    throw error;
  }
}

export async function writeExport(filePath: string, text: string, force: boolean): Promise<Result<string>> {
  if (!force && (await fileExists(filePath))) {
    return { ok: false, error: `File ${filePath} already exists. Add --force to overwrite it.` };
  }
  await writeTextSafely(filePath, text);
  return { ok: true, value: filePath };
}

function isLockBusy(error: unknown): boolean {
  return (
    isRecord(error) && (error["code"] === "EEXIST" || error["code"] === "EPERM" || error["code"] === "EBUSY")
  );
}

async function removeIfStale(lockFile: string, staleMs: number): Promise<void> {
  try {
    const info = await stat(lockFile);
    if (Date.now() - info.mtimeMs > staleMs) {
      await rm(lockFile, { force: true });
    }
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }
}

export function lockPathFor(filePath: string): string {
  return `${filePath}${config.lockSuffix}`;
}

export interface LockOptions {
  waitMs?: number;
  staleMs?: number;
}

// Only one command at a time may read-change-write the data file. The lock is a file created
// with the "wx" flag (fails if it exists). A lock older than staleMs is left over from a crash.
export async function withLock<T>(
  filePath: string,
  action: () => Promise<T>,
  { waitMs = config.lockWaitMs, staleMs = config.lockStaleMs }: LockOptions = {},
): Promise<T> {
  const lockFile = lockPathFor(filePath);
  await mkdir(dirname(filePath), { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      const handle = await open(lockFile, "wx");
      await handle.writeFile(String(process.pid));
      await handle.close();
      break;
    } catch (error) {
      if (!isLockBusy(error)) {
        throw error;
      }
      await removeIfStale(lockFile, staleMs);
      if (Date.now() > deadline) {
        throw new Error(
          `Could not lock ${filePath}: another command is using it. If none is running, delete ${lockFile}.`,
        );
      }
      await sleep(config.lockRetryMs);
    }
  }
  try {
    return await action();
  } finally {
    await rm(lockFile, { force: true });
  }
}
