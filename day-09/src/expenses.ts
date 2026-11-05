import { config } from "./config.js";

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export interface Store {
  nextId: number;
  expenses: Expense[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CategoryTotal {
  category: string;
  paisa: number;
}

export interface Totals {
  paisa: number;
  byCategory: CategoryTotal[];
}

const amountPattern = /^-?\d+(\.\d+)?$/;
const idPattern = /^\d+$/;

export function emptyStore(): Store {
  return { nextId: 1, expenses: [] };
}

export function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}

export function formatPaisa(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

export function parseAmount(input: string | undefined): Result<number> {
  const text = input?.trim() ?? "";
  if (text === "") {
    return { ok: false, error: "Amount is required." };
  }
  if (!amountPattern.test(text)) {
    return { ok: false, error: `Amount must be a number, got "${text}".` };
  }
  const amount = Number(text);
  if (amount <= 0) {
    return { ok: false, error: `Amount must be greater than 0, got ${text}.` };
  }
  const decimals = text.split(".")[1]?.length ?? 0;
  if (decimals > config.maxDecimals) {
    return { ok: false, error: `Amount can have at most ${config.maxDecimals} decimals, got ${text}.` };
  }
  return { ok: true, value: amount };
}

export function parseDescription(input: string | undefined): Result<string> {
  const text = input?.trim() ?? "";
  if (text === "") {
    return { ok: false, error: "Description is required." };
  }
  return { ok: true, value: text };
}

export function parseCategory(input: string | undefined): string {
  const text = input?.trim().toLowerCase() ?? "";
  return text === "" ? config.defaultCategory : text;
}

export function parseId(input: string | undefined): Result<number> {
  const text = input?.trim() ?? "";
  if (text === "") {
    return { ok: false, error: "Id is required." };
  }
  if (!idPattern.test(text) || Number(text) < 1) {
    return { ok: false, error: `Id must be a whole number above 0, got "${text}".` };
  }
  return { ok: true, value: Number(text) };
}

export function addExpense(
  store: Store,
  amountInput: string | undefined,
  descriptionInput: string | undefined,
  categoryInput: string | undefined,
  now: Date,
): Result<{ store: Store; expense: Expense }> {
  const amount = parseAmount(amountInput);
  if (!amount.ok) {
    return amount;
  }
  const description = parseDescription(descriptionInput);
  if (!description.ok) {
    return description;
  }
  const highestId = store.expenses.reduce((max, expense) => Math.max(max, expense.id), 0);
  const id = Math.max(store.nextId, highestId + 1);
  const expense: Expense = {
    id,
    amount: amount.value,
    description: description.value,
    category: parseCategory(categoryInput),
    date: now.toISOString(),
  };
  return { ok: true, value: { store: { nextId: id + 1, expenses: [...store.expenses, expense] }, expense } };
}

export function deleteExpense(
  store: Store,
  idInput: string | undefined,
): Result<{ store: Store; removed: Expense }> {
  const id = parseId(idInput);
  if (!id.ok) {
    return id;
  }
  const removed = store.expenses.find((expense) => expense.id === id.value);
  if (removed === undefined) {
    return { ok: false, error: `No expense with id ${id.value}.` };
  }
  const expenses = store.expenses.filter((expense) => expense.id !== id.value);
  return { ok: true, value: { store: { nextId: store.nextId, expenses }, removed } };
}

export function filterByCategory(expenses: Expense[], categoryInput: string | undefined): Expense[] {
  if (categoryInput === undefined || categoryInput.trim() === "") {
    return expenses;
  }
  const category = parseCategory(categoryInput);
  return expenses.filter((expense) => expense.category === category);
}

export function computeTotals(expenses: Expense[]): Totals {
  const byCategory = new Map<string, number>();
  let paisa = 0;
  for (const expense of expenses) {
    const value = toPaisa(expense.amount);
    paisa += value;
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + value);
  }
  const rows = [...byCategory.entries()]
    .map(([category, total]) => ({ category, paisa: total }))
    .sort((a, b) => a.category.localeCompare(b.category));
  return { paisa, byCategory: rows };
}

export function formatTable(expenses: Expense[]): string {
  if (expenses.length === 0) {
    return config.emptyMessage;
  }
  const header = ["ID", "DATE", "CATEGORY", "AMOUNT", "DESCRIPTION"];
  const rows = expenses.map((expense) => [
    String(expense.id),
    expense.date.slice(0, 10),
    expense.category,
    formatPaisa(toPaisa(expense.amount)),
    expense.description,
  ]);
  const all = [header, ...rows];
  const widths = header.map((_, column) => Math.max(...all.map((row) => (row[column] ?? "").length)));
  return all
    .map((row) =>
      row
        .map((cell, column) => {
          const width = widths[column] ?? 0;
          return column === 3 ? cell.padStart(width) : cell.padEnd(width);
        })
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

export function formatTotals(totals: Totals): string {
  const lines = totals.byCategory.map((row) => `  ${row.category}: ${formatPaisa(row.paisa)}`);
  const head = totals.byCategory.length === 0 ? [config.emptyMessage] : [];
  return [...head, `Total: ${formatPaisa(totals.paisa)}`, ...lines].join("\n");
}
