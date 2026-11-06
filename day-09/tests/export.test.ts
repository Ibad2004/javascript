import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { addExpense, emptyStore, type Expense } from "../src/expenses.js";
import { escapeCsvCell, parseCsvPath, toCsv } from "../src/export.js";

function expense(description: string, category = "food", amount = "10"): Expense {
  const result = addExpense(
    emptyStore(),
    amount,
    description,
    category,
    new Date("2026-11-05T22:30:00.000Z"),
  );
  assert.ok(result.ok);
  return result.value.expense;
}

describe("toCsv", () => {
  test("no expenses gives the header row only", () => {
    assert.equal(toCsv([]), "id,date,category,amount,description\r\n");
  });

  test("writes amount with 2 decimals and date as YYYY-MM-DD", () => {
    assert.equal(
      toCsv([expense("Tea", "food", "120.5")]),
      "id,date,category,amount,description\r\n1,2026-11-05,food,120.50,Tea\r\n",
    );
  });

  test("quotes values with commas, quotes or new lines and doubles quotes", () => {
    assert.equal(escapeCsvCell("Lunch, with team"), '"Lunch, with team"');
    assert.equal(escapeCsvCell('The "best" tea'), '"The ""best"" tea"');
    assert.equal(escapeCsvCell("line one\nline two"), '"line one\nline two"');
    assert.equal(escapeCsvCell("plain"), "plain");
  });

  test("prefixes cells starting with = + - @ with a quote against CSV injection", () => {
    assert.equal(escapeCsvCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
    assert.equal(escapeCsvCell("+92 300"), "'+92 300");
    assert.equal(escapeCsvCell("-5 discount"), "'-5 discount");
    assert.equal(escapeCsvCell("@home"), "'@home");
    assert.equal(escapeCsvCell('=HYPERLINK("x","y")'), '"\'=HYPERLINK(""x"",""y"")"');
  });

  test("protects the category column too", () => {
    assert.match(toCsv([expense("Tea", "=cmd")]), /,'=cmd,/);
  });
});

describe("parseCsvPath", () => {
  test("accepts a file name ending with .csv in any case", () => {
    assert.deepEqual(parseCsvPath("expenses.csv"), { ok: true, value: "expenses.csv" });
    assert.deepEqual(parseCsvPath("out/Report.CSV"), { ok: true, value: "out/Report.CSV" });
  });

  test("rejects a missing name, another extension and a bare .csv", () => {
    for (const name of [
      undefined,
      "  ",
      "expenses.json",
      "expenses",
      "expenses.csv.txt",
      ".csv",
      "out/.csv",
    ]) {
      assert.equal(parseCsvPath(name).ok, false, String(name));
    }
  });
});
