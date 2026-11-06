import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addExpense,
  computeTotals,
  deleteExpense,
  editExpense,
  filterByMonth,
  emptyStore,
  filterByCategory,
  formatList,
  formatTable,
  formatTotals,
  parseAmount,
  parseCategory,
  parseMonth,
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

  test("accepts the largest allowed amount exactly", () => {
    assert.deepEqual(parseAmount("1000000000"), { ok: true, value: 1_000_000_000 });
    assert.deepEqual(parseAmount("999999999.99"), { ok: true, value: 999_999_999.99 });
  });

  test("rejects an amount above the maximum instead of saving a rounded value", () => {
    for (const text of ["1000000000.01", "99999999999999.99", "9007199254740993"]) {
      assert.deepEqual(parseAmount(text), {
        ok: false,
        error: `Amount can be at most 1000000000.00, got ${text}.`,
      });
    }
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

  test("list for a category with no expenses names that category", () => {
    const store = storeWith(["10", "A", "food"]);
    assert.equal(formatList(store.expenses, "Nope"), 'No expenses in category "nope".');
  });

  test("list with no expenses at all still says No expenses yet, even with a category", () => {
    assert.equal(formatList([], "food"), "No expenses yet");
    assert.equal(formatList([], undefined), "No expenses yet");
  });

  test("list without a category shows every expense", () => {
    const store = storeWith(["10", "A", "food"], ["20", "B", "transport"]);
    assert.equal(formatList(store.expenses, "  "), formatTable(store.expenses));
  });

  test("filters by category case-insensitively", () => {
    const store = storeWith(["10", "A", "food"], ["20", "B", "transport"]);
    assert.deepEqual(
      filterByCategory(store.expenses, " FOOD ").map((expense) => expense.id),
      [1],
    );
  });
});

describe("editExpense", () => {
  const base = storeWith(["10", "Tea", "food"], ["120.50", "Bus fare", "transport"]);

  test("changes only the given fields and keeps id and date", () => {
    const result = editExpense(base, "2", { amount: "150" });
    assert.ok(result.ok);
    assert.deepEqual(result.value.expense, {
      id: 2,
      amount: 150,
      description: "Bus fare",
      category: "transport",
      date: "2026-11-05T10:00:00.000Z",
    });
    assert.deepEqual(result.value.store.expenses[0], base.expenses[0]);
    assert.equal(base.expenses[1]?.amount, 120.5);
  });

  test("trims and lowercases a new category and trims a new description", () => {
    const result = editExpense(base, "1", { description: "  Green tea ", category: " Drinks " });
    assert.ok(result.ok);
    assert.equal(result.value.expense.description, "Green tea");
    assert.equal(result.value.expense.category, "drinks");
  });

  test("edit rejects a missing, non-number or unknown id", () => {
    assert.deepEqual(editExpense(base, undefined, { amount: "5" }), { ok: false, error: "Id is required." });
    assert.equal(editExpense(base, "abc", { amount: "5" }).ok, false);
    assert.deepEqual(editExpense(base, "99", { amount: "5" }), {
      ok: false,
      error: "No expense with id 99.",
    });
  });

  test("edit rejects no fields", () => {
    const result = editExpense(base, "1", {});
    assert.ok(!result.ok && result.error.startsWith("Nothing to edit."));
  });

  test("edit rejects invalid new values with the same rules as add", () => {
    for (const amount of ["0", "-5", "abc", "12.345", "Infinity", "1000000000.01"]) {
      assert.equal(editExpense(base, "1", { amount }).ok, false, amount);
    }
    assert.equal(editExpense(base, "1", { description: "   " }).ok, false);
    assert.deepEqual(editExpense(base, "1", { category: "  " }), {
      ok: false,
      error: "Category cannot be empty.",
    });
  });
});

describe("monthly total", () => {
  function storeOverMonths(): Store {
    let store = emptyStore();
    const rows: [string, string, string, string][] = [
      ["10", "Tea", "food", "2026-10-31T23:59:59.000Z"],
      ["20", "Lunch", "food", "2026-11-01T00:00:00.000Z"],
      ["5.5", "Bus", "transport", "2026-11-30T12:00:00.000Z"],
    ];
    for (const [amount, description, category, date] of rows) {
      const result = addExpense(store, amount, description, category, new Date(date));
      assert.ok(result.ok);
      store = result.value.store;
    }
    return store;
  }

  test("accepts a YYYY-MM month", () => {
    assert.deepEqual(parseMonth("2026-11"), { ok: true, value: "2026-11" });
    assert.deepEqual(parseMonth(" 2026-01 "), { ok: true, value: "2026-01" });
  });

  test("rejects 2026-13, 2026-1, 26-11, abc and 2026-00", () => {
    for (const month of ["2026-13", "2026-1", "26-11", "abc", "2026-00", "2026-11-05"]) {
      assert.equal(parseMonth(month).ok, false, month);
    }
  });

  test("rejects a missing month", () => {
    assert.deepEqual(parseMonth(undefined), { ok: false, error: "Month is required, for example 2026-11." });
  });

  test("totals only the expenses of that month", () => {
    const totals = computeTotals(filterByMonth(storeOverMonths().expenses, "2026-11"));
    assert.equal(
      formatTotals(totals, "No expenses in 2026-11"),
      "Total: 25.50\n  food: 20.00\n  transport: 5.50",
    );
  });

  test("a month with no expenses says so and totals 0.00, never NaN", () => {
    const totals = computeTotals(filterByMonth(storeOverMonths().expenses, "2026-12"));
    const text = formatTotals(totals, "No expenses in 2026-12");
    assert.equal(text, "No expenses in 2026-12\nTotal: 0.00");
    assert.ok(!text.includes("NaN"));
  });
});
