import test from "node:test";
import assert from "node:assert/strict";
import { load } from "../test-utils.js";

const u = (f) => new URL(f, import.meta.url);

test("06 deposit/withdraw reject <= 0", () => {
  const { account, deposit, withdraw } = load(u("./06-bank-account.js"), ["account", "deposit", "withdraw"]);
  const before = account.balance;
  withdraw(account, 0);
  withdraw(account, -5);
  deposit(account, 0);
  assert.equal(account.balance, before);
});

test("09 sell/restock reject negatives", () => {
  const { stock, sell, restock } = load(u("./09-inventory.js"), ["stock", "sell", "restock"]);
  const apples = stock.apples;
  sell("apples", -3);
  restock("apples", -3);
  assert.equal(stock.apples, apples);
});

test("05 countWords splits on whitespace, strips punctuation, no empty words", () => {
  const { countWords } = load(u("./05-word-counter.js"), ["countWords"]);
  assert.deepEqual(countWords("The cat,  the\tdog!  "), { the: 2, cat: 1, dog: 1 });
  assert.equal(countWords("   ")[""], undefined);
});

test("07 removeTodo reports an unknown id", () => {
  const { removeTodo, logs } = load(u("./07-todo-list.js"), ["removeTodo"]);
  removeTodo(999);
  assert.ok(logs.includes("No task with id 999"));
});
