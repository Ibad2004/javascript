import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "../test-utils.js";

const u = (f) => new URL(f, import.meta.url);

test("02 deposit/withdraw reject <= 0", () => {
  const { createAccount } = load(u("./02-closure-bank-pin.js"), ["createAccount"]);
  const acc = createAccount("T", 1);
  assert.match(acc.deposit(0), /more than 0/);
  assert.match(acc.deposit(-5), /more than 0/);
  assert.match(acc.withdraw(-5, 1), /more than 0/);
  assert.equal(acc.getBalance(1), 0);
});

test("README arrowMethod snippet matches the file and mentions strict mode", () => {
  const readme = readFileSync(u("./README.md"), "utf8");
  assert.ok(readme.includes("arrowMethod: () => {\n    return `arrowMethod sees this = ${this}`;\n  },") || readme.includes("arrowMethod: () => {\r\n    return `arrowMethod sees this = ${this}`;\r\n  },"));
  assert.match(readme, /strict mode/);
});
