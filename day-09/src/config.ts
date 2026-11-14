import { fileURLToPath } from "node:url";

export const config = Object.freeze({
  dataFile:
    process.env["EXPENSES_FILE"] ?? fileURLToPath(new URL("../../data/expenses.json", import.meta.url)),
  defaultCategory: "other",
  maxDecimals: 2,
  maxAmount: 1_000_000_000,
  emptyMessage: "No expenses yet",
  monthPattern: /^\d{4}-(0[1-9]|1[0-2])$/,
  csvFormulaStarts: ["=", "+", "-", "@", "\t", "\r"],
  csvLineEnding: "\r\n",
  lockSuffix: ".lock",
  lockStaleMs: 10_000,
  lockRetryMs: 20,
  lockWaitMs: 5_000,
});
