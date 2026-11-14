import { basename } from "node:path";
import { config } from "./config.js";
import { formatPaisa, localDay, type Expense, type Result } from "./expenses.js";

export const csvColumns = ["id", "date", "category", "amount", "description"];

export function protectFormula(value: string): string {
  return config.csvFormulaStarts.some((start) => value.startsWith(start)) ? `'${value}` : value;
}

export function escapeCsvCell(value: string): string {
  const safe = protectFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(expenses: Expense[]): string {
  const rows = expenses.map((expense) => [
    String(expense.id),
    localDay(expense.date),
    expense.category,
    formatPaisa(expense.amountPaisa),
    expense.description,
  ]);
  return [csvColumns, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .map((line) => `${line}${config.csvLineEnding}`)
    .join("");
}

export function parseCsvPath(input: string | undefined): Result<string> {
  const text = input?.trim() ?? "";
  if (text === "") {
    return { ok: false, error: "File name is required, for example: export expenses.csv" };
  }
  if (!text.toLowerCase().endsWith(".csv") || basename(text).length === ".csv".length) {
    return { ok: false, error: `File name must end with .csv, got "${text}".` };
  }
  return { ok: true, value: text };
}
