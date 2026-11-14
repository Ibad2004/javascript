import "./set-tz.js";
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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

function cliAsync(...args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cliPath, ...args],
      { encoding: "utf8", env: { ...process.env, EXPENSES_FILE: join(dir, "expenses.json") } },
      (error, _stdout, stderr) => {
        const code = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
        resolve({ code, stderr });
      },
    );
  });
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

test("export writes a CSV, refuses to overwrite it, and --force overwrites", async () => {
  const file = join(dir, "out.csv");
  cli("add", "450", 'Lunch, "team"', "food");
  const first = cli("export", file);
  assert.equal(first.code, 0);
  assert.equal(first.stdout.trim(), `Exported 1 expense to ${file}`);
  const day = new Date().toISOString().slice(0, 10);
  assert.equal(
    await readFile(file, "utf8"),
    `id,date,category,amount,description\r\n1,${day},food,450.00,"Lunch, ""team"""\r\n`,
  );
  const again = cli("export", file);
  assert.equal(again.code, 1);
  assert.match(again.stderr, /already exists\. Add --force/);
  assert.equal(cli("export", "--force", file).code, 0);
});

test("export with no expenses writes the header row and says so", async () => {
  const file = join(dir, "empty.csv");
  const result = cli("export", file);
  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), `No expenses yet. Exported the header row only to ${file}`);
  assert.equal(await readFile(file, "utf8"), "id,date,category,amount,description\r\n");
});

test("export with a bad file name or option exits with code 1", () => {
  const cases: [string[], RegExp][] = [
    [["export"], /File name is required/],
    [["export", "expenses.json"], /must end with \.csv/],
    [["export", "a.csv", "b.csv"], /Unexpected argument "b\.csv"/],
    [["export", "a.csv", "--overwrite"], /Unknown option "--overwrite"/],
    [["export", "a.csv", "--force", "--force"], /was given twice/],
  ];
  for (const [args, message] of cases) {
    const result = cli(...args);
    assert.equal(result.code, 1, args.join(" "));
    assert.match(result.stderr, message, args.join(" "));
  }
});

test("8 adds at the same time keep all 8 expenses", async () => {
  const runs = Array.from({ length: 8 }, (_, index) =>
    cliAsync("add", String(index + 1), `Item ${index + 1}`, "food"),
  );
  const results = await Promise.all(runs);
  for (const result of results) {
    assert.equal(result.code, 0, result.stderr);
  }
  const saved: unknown = JSON.parse(await readFile(join(dir, "expenses.json"), "utf8"));
  assert.ok(
    typeof saved === "object" && saved !== null && "expenses" in saved && Array.isArray(saved.expenses),
  );
  assert.equal(saved.expenses.length, 8);
  const ids = saved.expenses.map((expense: unknown) =>
    typeof expense === "object" && expense !== null && "id" in expense ? expense.id : undefined,
  );
  assert.deepEqual([...ids].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(await readdir(dir), ["expenses.json"]);
});

test("a description with a new line exits with code 1 and saves nothing", () => {
  const result = cli("add", "5", "line one\nline two", "food");
  assert.equal(result.code, 1);
  assert.match(result.stderr, /cannot contain new lines/);
  assert.equal(cli("list").stdout.trim(), "No expenses yet");
});

test("new expenses are saved as whole paisa", async () => {
  assert.equal(cli("add", "19.99", "Tea", "food").code, 0);
  const text = await readFile(join(dir, "expenses.json"), "utf8");
  assert.match(text, /"amountPaisa": 1999/);
  assert.ok(!/"amount":/.test(text));
});
