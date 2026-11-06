import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));
let dir = "";

function cli(...args: string[]): { code: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    env: { ...process.env, EXPENSES_FILE: join(dir, "expenses.json") },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "day-09-cli-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("unknown command shows help and exits with code 1", () => {
  const result = cli("spend");
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown command "spend"/);
  assert.match(result.stderr, /Usage: npm start -- <command>/);
});

test("help, --help and -h show help and exit with code 0", () => {
  for (const flag of ["help", "--help", "-h"]) {
    const result = cli(flag);
    assert.equal(result.code, 0, flag);
    assert.match(result.stdout, /Usage: npm start -- <command>/, flag);
  }
});

test("an amount above the maximum exits with code 1 and saves nothing", () => {
  const result = cli("add", "99999999999999.99", "Yacht");
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Amount can be at most 1000000000\.00/);
  assert.equal(cli("list").stdout.trim(), "No expenses yet");
});

test("no command shows help and exits with code 0", () => {
  const result = cli();
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Usage:/);
});

test("bad amount exits with code 1 and saves nothing", () => {
  const result = cli("add", "abc", "Lunch");
  assert.equal(result.code, 1);
  assert.equal(cli("list").stdout.trim(), "No expenses yet");
});

test("add then total exits with code 0", () => {
  assert.equal(cli("add", "450", "Lunch", "Food").code, 0);
  const total = cli("total");
  assert.equal(total.code, 0);
  assert.equal(total.stdout.trim(), "Total: 450.00\n  food: 450.00");
});

test("edit changes the given field and prints the edited expense", () => {
  cli("add", "120.50", "Bus fare", "transport");
  const result = cli("edit", "1", "--amount", "150");
  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "Edited #1: 150.00 Bus fare (transport)");
});

test("bad edits exit with code 1 and leave the file unchanged", async () => {
  cli("add", "10", "Tea", "food");
  const before = await readFile(join(dir, "expenses.json"), "utf8");
  const cases: [string[], RegExp][] = [
    [["edit"], /Id is required/],
    [["edit", "abc", "--amount", "5"], /Id must be a whole number/],
    [["edit", "99", "--amount", "5"], /No expense with id 99/],
    [["edit", "1"], /Nothing to edit/],
    [["edit", "1", "--price", "5"], /Unknown option "--price"/],
    [["edit", "1", "--amount"], /Option "--amount" needs a value/],
    [["edit", "1", "--amount", "--category", "x"], /Option "--amount" needs a value/],
    [["edit", "1", "--amount", "5", "--amount", "6"], /Option "--amount" was given twice/],
    [["edit", "1", "--amount", "0"], /greater than 0/],
    [["edit", "1", "--constructor", "x"], /Unknown option "--constructor"/],
    [["edit", "1", "Green", "tea"], /Unexpected argument "Green"/],
  ];
  for (const [args, message] of cases) {
    const result = cli(...args);
    assert.equal(result.code, 1, args.join(" "));
    assert.match(result.stderr, message, args.join(" "));
  }
  assert.equal(await readFile(join(dir, "expenses.json"), "utf8"), before);
});

test("total --month shows that month and an empty month says so", () => {
  cli("add", "450", "Lunch", "food");
  const month = new Date().toISOString().slice(0, 7);
  const current = cli("total", "--month", month);
  assert.equal(current.code, 0);
  assert.equal(current.stdout.trim(), "Total: 450.00\n  food: 450.00");
  const empty = cli("total", "--month", "1999-12");
  assert.equal(empty.code, 0);
  assert.equal(empty.stdout.trim(), "No expenses in 1999-12\nTotal: 0.00");
  assert.equal(cli("total").stdout.trim(), "Total: 450.00\n  food: 450.00");
});

test("total with a bad or missing month exits with code 1", () => {
  const cases: [string[], RegExp][] = [
    [["total", "--month"], /Option "--month" needs a value/],
    [["total", "--month", "2026-13"], /Month must be YYYY-MM with month 01-12, got "2026-13"/],
    [["total", "--month", "26-11"], /Month must be YYYY-MM/],
    [["total", "--month", "2026-11", "--month", "2026-12"], /was given twice/],
    [["total", "2026-11"], /Unexpected argument "2026-11"/],
  ];
  for (const [args, message] of cases) {
    const result = cli(...args);
    assert.equal(result.code, 1, args.join(" "));
    assert.match(result.stderr, message, args.join(" "));
  }
});
