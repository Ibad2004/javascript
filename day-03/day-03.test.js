import test from "node:test";
import assert from "node:assert/strict";
import { load } from "../test-utils.js";

const u = (f) => new URL(f, import.meta.url);

test("01 tax is integer paisa", () => {
  const { withTax } = load(u("./01-map-products.js"), ["withTax"]);
  for (const p of withTax) assert.ok(Number.isInteger(p.priceWithTaxPaisa));
  assert.equal(withTax[1].priceWithTaxPaisa, 234000);
});

test("03 empty cart does not crash", () => {
  const { mostExpensive, total } = load(u("./03-reduce-totals.js"), ["mostExpensive", "total"], (s) =>
    s.replace(/const cart = \[[\s\S]*?\n\];/, "const cart = [];"),
  );
  assert.equal(mostExpensive, null);
  assert.equal(total, 0);
});

test("04 no delivered orders gives average 0, not NaN", () => {
  const { average } = load(u("./04-orders-report.js"), ["average"], (s) => s.replace('o.status === "delivered"', 'o.status === "none"'));
  assert.equal(average, 0);
});

test("09 grade D for 60-69 and groups built with push", () => {
  const { getGrade, byGrade } = load(u("./09-group-by.js"), ["getGrade", "byGrade"]);
  assert.equal(getGrade(65), "D");
  assert.equal(getGrade(59), "F");
  assert.deepEqual(byGrade.A, ["Sara", "Ali"]);
});

test("10 one player does not crash; ties sort by name", () => {
  const one = load(u("./10-leaderboard.js"), ["board"], (s) =>
    s.replace(/const round1 = \[[\s\S]*?\n\];/, 'const round1 = [{ player: "Solo", points: 5 }];').replace(/const round2 = \[[\s\S]*?\n\];/, "const round2 = [];"),
  );
  assert.equal(one.board.length, 1);
  assert.ok(one.logs.includes("Runner-up: none"));
  const tie = load(u("./10-leaderboard.js"), ["board"], (s) =>
    s.replace(/const round1 = \[[\s\S]*?\n\];/, 'const round1 = [{ player: "Zed", points: 5 }, { player: "Amy", points: 5 }];').replace(/const round2 = \[[\s\S]*?\n\];/, "const round2 = [];"),
  );
  assert.deepEqual(tie.board.map((b) => b.player), ["Amy", "Zed"]);
});
