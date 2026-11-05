import { fileURLToPath } from "node:url";

export const config = Object.freeze({
  dataFile:
    process.env["EXPENSES_FILE"] ?? fileURLToPath(new URL("../../data/expenses.json", import.meta.url)),
  defaultCategory: "other",
  maxDecimals: 2,
  emptyMessage: "No expenses yet",
});
