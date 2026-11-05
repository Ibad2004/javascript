import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addExpense,
  computeTotals,
  deleteExpense,
  emptyStore,
  filterByCategory,
  formatTable,
  formatTotals,
  parseAmount,
  parseCategory,
  type Store,
} from "../src/expenses.js";

const now = new Date("2026-11-05T10:00:00.000Z");

function storeWith(...rows: [string, string, string?][]): Store {
  let store = emptyStore();
  for (const [amount, description, category] of rows) {
    const result = addExpense(store, amount, description, category, now);
    assert.ok(result.ok);
    store = result.value.store;
  }
  return store;
}

describe("parseAmount", () => {
  test("accepts a positive amount with up to 2 decimals", () => {
    assert.deepEqual(parseAmount("12.34"), { ok: true, value: 12.34 });
    assert.deepEqual(parseAmount(" 450 "), { ok: true, value: 450 });
  });

  test("rejects amount 0", () => {
    assert.equal(parseAmount("0").ok, false);
  });

  test("rejects a negative amount", () => {
    assert.equal(parseAmount("-5").ok, false);
  });

  test("rejects a non-number amount like abc", () => {
    assert.equal(parseAmount("abc").ok, false);
  });

  test("rejects more than 2 decimals like 12.345", () => {
    assert.equal(parseAmount("12.345").ok, false);
  });

  test("rejects Infinity", () => {
    assert.equal(parseAmount("Infinity").ok, false);
  });

  test("rejects a missing amount", () => {
    assert.deepEqual(parseAmount(undefined), { ok: false, error: "Amount is required." });
  });
});

describe("addExpense", () => {
  test("rejects an empty or blank description", () => {
    assert.equal(addExpense(emptyStore(), "10", "", undefined, now).ok, false);
    assert.equal(addExpense(emptyStore(), "10", "   ", undefined, now).ok, false);
    assert.equal(addExpense(emptyStore(), "10", undefined, undefined, now).ok, false);
  });

  test("trims and lowercases the category and defaults to other", () => {
    assert.equal(parseCategory("  Food "), "food");
    assert.equal(parseCategory(undefined), "other");
    assert.equal(parseCategory("   "), "other");
  });

  test("stores an ISO date and does not change the input store", () => {
    const store = emptyStore();
    const result = addExpense(store, "10", "Tea", "Food", now);
    assert.ok(result.ok);
    assert.equal(result.value.expense.date, "2026-11-05T10:00:00.000Z");
    assert.equal(store.expenses.length, 0);
  });

  test("never reuses an id after the highest one is deleted", () => {
    const store = storeWith(["10", "A"], ["20", "B"]);
    const deleted = deleteExpense(store, "2");
    assert.ok(deleted.ok);
    const added = addExpense(deleted.value.store, "30", "C", undefined, now);
    assert.ok(added.ok);
    assert.equal(added.value.expense.id, 3);
  });
});

describe("deleteExpense", () => {
  test("deletes an existing id", () => {
    const result = deleteExpense(storeWith(["10", "A"]), "1");
    assert.ok(result.ok);
    assert.equal(result.value.store.expenses.length, 0);
  });

  test("rejects an id that does not exist", () => {
    assert.deepEqual(deleteExpense(storeWith(["10", "A"]), "99"), {
      ok: false,
      error: "No expense with id 99.",
    });
  });

  test("rejects a non-number id like abc", () => {
    assert.equal(deleteExpense(storeWith(["10", "A"]), "abc").ok, false);
  });

  test("rejects a missing id", () => {
    assert.deepEqual(deleteExpense(storeWith(["10", "A"]), undefined), {
      ok: false,
      error: "Id is required.",
    });
  });
});

describe("list and total", () => {
  test("list with no expenses says No expenses yet", () => {
    assert.equal(formatTable([]), "No expenses yet");
  });

  test("total with no expenses is 0.00 and never NaN", () => {
    const text = formatTotals(computeTotals([]));
    assert.equal(text, "No expenses yet\nTotal: 0.00");
    assert.ok(!text.includes("NaN"));
  });

  test("totals use whole paisa so 0.1 + 0.2 is exactly 0.30", () => {
    const totals = computeTotals(storeWith(["0.1", "A", "x"], ["0.2", "B", "x"]).expenses);
    assert.equal(totals.paisa, 30);
    assert.equal(formatTotals(totals), "Total: 0.30\n  x: 0.30");
  });

  test("filters by category case-insensitively", () => {
    const store = storeWith(["10", "A", "food"], ["20", "B", "transport"]);
    assert.deepEqual(
      filterByCategory(store.expenses, " FOOD ").map((expense) => expense.id),
      [1],
    );
  });
});
