import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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
