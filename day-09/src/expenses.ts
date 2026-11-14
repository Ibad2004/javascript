import { config } from "./config.js";

export interface Expense {
  id: number;
  amountPaisa: number;
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
// C0/C1 control characters (new lines, tabs, ...) and the Unicode line/paragraph separators
const controlPattern = /[\p{Cc}\p{Zl}\p{Zp}]/u;

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
  if (amount > config.maxAmount) {
    return {
      ok: false,
      error: `Amount can be at most ${formatPaisa(toPaisa(config.maxAmount))}, got ${text}.`,
    };
  }
  return { ok: true, value: amount };
}

export function parseDescription(input: string | undefined): Result<string> {
  const text = input?.trim() ?? "";
  if (text === "") {
    return { ok: false, error: "Description is required." };
  }
  if (controlPattern.test(text)) {
    return {
      ok: false,
      error:
        "Description cannot contain new lines, tabs or other control characters. Use one line of plain text.",
    };
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
    amountPaisa: toPaisa(amount.value),
    description: description.value,
    category: parseCategory(categoryInput),
    date: now.toISOString(),
  };
  return { ok: true, value: { store: { nextId: id + 1, expenses: [...store.expenses, expense] }, expense } };
}

export function describeExpense(expense: Expense): string {
  return `#${expense.id}: ${formatPaisa(expense.amountPaisa)} ${expense.description} (${expense.category})`;
}

export interface ExpenseChanges {
  amount?: string | undefined;
  description?: string | undefined;
  category?: string | undefined;
}

export function editExpense(
  store: Store,
  idInput: string | undefined,
  changes: ExpenseChanges,
): Result<{ store: Store; expense: Expense }> {
  const id = parseId(idInput);
  if (!id.ok) {
    return id;
  }
  const current = store.expenses.find((expense) => expense.id === id.value);
  if (current === undefined) {
    return { ok: false, error: `No expense with id ${id.value}.` };
  }
  if (changes.amount === undefined && changes.description === undefined && changes.category === undefined) {
    return { ok: false, error: "Nothing to edit. Give at least one of --amount, --description, --category." };
  }
  let expense: Expense = { ...current };
  if (changes.amount !== undefined) {
    const amount = parseAmount(changes.amount);
    if (!amount.ok) {
      return amount;
    }
    expense = { ...expense, amountPaisa: toPaisa(amount.value) };
  }
  if (changes.description !== undefined) {
    const description = parseDescription(changes.description);
    if (!description.ok) {
      return description;
    }
    expense = { ...expense, description: description.value };
  }
  if (changes.category !== undefined) {
    if (changes.category.trim() === "") {
      return { ok: false, error: "Category cannot be empty." };
    }
    expense = { ...expense, category: parseCategory(changes.category) };
  }
  const expenses = store.expenses.map((item) => (item.id === expense.id ? expense : item));
  return { ok: true, value: { store: { nextId: store.nextId, expenses }, expense } };
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

export function formatList(expenses: Expense[], categoryInput: string | undefined): string {
  const shown = filterByCategory(expenses, categoryInput);
  const hasCategory = categoryInput !== undefined && categoryInput.trim() !== "";
  if (shown.length === 0 && expenses.length > 0 && hasCategory) {
    return `No expenses in category "${parseCategory(categoryInput)}".`;
  }
  return formatTable(shown);
}

export function parseMonth(input: string | undefined): Result<string> {
  const text = input?.trim() ?? "";
  if (text === "") {
    return { ok: false, error: "Month is required, for example 2026-11." };
  }
  if (!config.monthPattern.test(text)) {
    return { ok: false, error: `Month must be YYYY-MM with month 01-12, got "${text}".` };
  }
  return { ok: true, value: text };
}

// The day (YYYY-MM-DD) in the computer's LOCAL time zone, not UTC.
export function localDay(date: string): string {
  const parsed = new Date(date);
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${String(parsed.getFullYear()).padStart(4, "0")}-${month}-${day}`;
}

export function filterByMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((expense) => localDay(expense.date).startsWith(`${month}-`));
}

export function computeTotals(expenses: Expense[]): Totals {
  const byCategory = new Map<string, number>();
  let paisa = 0;
  for (const expense of expenses) {
    const value = expense.amountPaisa;
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
    localDay(expense.date),
    expense.category,
    formatPaisa(expense.amountPaisa),
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

export function formatTotals(totals: Totals, emptyMessage: string = config.emptyMessage): string {
  const lines = totals.byCategory.map((row) => `  ${row.category}: ${formatPaisa(row.paisa)}`);
  const head = totals.byCategory.length === 0 ? [emptyMessage] : [];
  return [...head, `Total: ${formatPaisa(totals.paisa)}`, ...lines].join("\n");
}
