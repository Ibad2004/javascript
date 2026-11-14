import "./set-tz.js";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, test } from "node:test";
import { loadStore, lockPathFor, parseStore, saveStore, withLock, writeExport } from "../src/storage.js";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "day-09-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadStore", () => {
  test("a missing data file starts empty", async () => {
    assert.deepEqual(await loadStore(join(dir, "nope.json")), {
      ok: true,
      value: { nextId: 1, expenses: [] },
    });
  });

  test("corrupted JSON gives a clear error and does not overwrite the file", async () => {
    const file = join(dir, "expenses.json");
    await writeFile(file, "{ not json");
    const result = await loadStore(file);
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error.includes("invalid JSON"));
    assert.equal(await readFile(file, "utf8"), "{ not json");
  });

  test("wrong shape in the file gives a clear error", async () => {
    const file = join(dir, "expenses.json");
    await writeFile(file, JSON.stringify({ nextId: 2, expenses: [{ id: 1, amount: "ten" }] }));
    const result = await loadStore(file);
    assert.ok(!result.ok && result.error.includes("expenses[0].amount"));
  });

  test("an amount above the maximum in the file gives a clear error", async () => {
    const file = join(dir, "expenses.json");
    const expense = { id: 1, amount: 2_000_000_000, description: "A", category: "x", date: "2026-11-05" };
    await writeFile(file, JSON.stringify({ nextId: 2, expenses: [expense] }));
    const result = await loadStore(file);
    assert.ok(!result.ok && result.error.includes("expenses[0].amount"));
  });

  test("loads the committed example file", async () => {
    const result = await loadStore(fileURLToPath(new URL("../../expenses.example.json", import.meta.url)));
    assert.ok(result.ok);
    assert.equal(result.value.expenses.length, 2);
  });
});

describe("parseStore", () => {
  test("rejects a bare array, duplicate ids and a bad date", () => {
    const expense = { id: 1, amount: 5, description: "A", category: "x", date: "2026-11-05T10:00:00.000Z" };
    assert.equal(parseStore([]).ok, false);
    assert.equal(parseStore({ nextId: 2, expenses: [expense, expense] }).ok, false);
    assert.equal(parseStore({ nextId: 2, expenses: [{ ...expense, date: "soon" }] }).ok, false);
  });
});

describe("saveStore", () => {
  test("writes the file with a temp file and rename, leaving no temp file", async () => {
    const file = join(dir, "data", "expenses.json");
    await saveStore(file, { nextId: 1, expenses: [] });
    assert.deepEqual(await readdir(join(dir, "data")), ["expenses.json"]);
    assert.deepEqual(await loadStore(file), { ok: true, value: { nextId: 1, expenses: [] } });
  });
});

describe("writeExport", () => {
  test("refuses to overwrite an existing file unless force is set", async () => {
    const file = join(dir, "expenses.csv");
    await writeFile(file, "old");
    const refused = await writeExport(file, "new", false);
    assert.ok(!refused.ok && refused.error.includes("Add --force"));
    assert.equal(await readFile(file, "utf8"), "old");
    assert.deepEqual(await writeExport(file, "new", true), { ok: true, value: file });
    assert.equal(await readFile(file, "utf8"), "new");
    assert.deepEqual(await readdir(dir), ["expenses.csv"]);
  });
});

describe("integer paisa in the file", () => {
  const base = { id: 1, description: "A", category: "x", date: "2026-11-05T10:00:00.000Z" };

  test("a new file with amountPaisa loads as it is", () => {
    const result = parseStore({ nextId: 2, expenses: [{ ...base, amountPaisa: 1999 }] });
    assert.ok(result.ok);
    assert.equal(result.value.expenses[0]?.amountPaisa, 1999);
  });

  test("an old file with a decimal amount still loads and is converted", () => {
    const result = parseStore({
      nextId: 3,
      expenses: [
        { ...base, amount: 19.99 },
        { ...base, id: 2, amount: 450 },
      ],
    });
    assert.ok(result.ok);
    assert.deepEqual(
      result.value.expenses.map((expense) => expense.amountPaisa),
      [1999, 45000],
    );
  });

  test("bad paisa values are rejected with a clear message", () => {
    for (const amountPaisa of [0, -5, 1.5, "100", Number.NaN, 1e12]) {
      const result = parseStore({ nextId: 2, expenses: [{ ...base, amountPaisa }] });
      assert.ok(!result.ok && result.error.includes("expenses[0].amountPaisa"), String(amountPaisa));
    }
    const none = parseStore({ nextId: 2, expenses: [base] });
    assert.ok(!none.ok && none.error.includes("expenses[0].amount"));
  });

  test("saving an old file writes amountPaisa and no decimal amount", async () => {
    const file = join(dir, "old.json");
    await writeFile(file, JSON.stringify({ nextId: 2, expenses: [{ ...base, amount: 19.99 }] }));
    const loaded = await loadStore(file);
    assert.ok(loaded.ok);
    await saveStore(file, loaded.value);
    const text = await readFile(file, "utf8");
    assert.ok(text.includes('"amountPaisa": 1999'));
    assert.ok(!/"amount":/.test(text));
  });
});

describe("withLock", () => {
  test("creates the lock while running and removes it afterwards", async () => {
    const file = join(dir, "data", "expenses.json");
    await withLock(file, async () => {
      assert.ok((await readdir(join(dir, "data"))).includes("expenses.json.lock"));
    });
    assert.deepEqual(await readdir(join(dir, "data")), []);
  });

  test("removes the lock even when the action throws", async () => {
    const file = join(dir, "expenses.json");
    await assert.rejects(
      withLock(file, () => Promise.reject(new Error("boom"))),
      /boom/,
    );
    assert.deepEqual(await readdir(dir), []);
  });

  test("a second caller waits for a fresh lock, then gives up with a clear error", async () => {
    const file = join(dir, "expenses.json");
    await writeFile(lockPathFor(file), "123");
    await assert.rejects(
      withLock(file, () => Promise.resolve(1), { waitMs: 100 }),
      /Could not lock/,
    );
    assert.ok((await readdir(dir)).includes("expenses.json.lock"));
  });

  test("a lock older than 10 seconds is stale and is taken over", async () => {
    const file = join(dir, "expenses.json");
    const lock = lockPathFor(file);
    await writeFile(lock, "123");
    const old = new Date(Date.now() - 11_000);
    await utimes(lock, old, old);
    assert.equal(await withLock(file, () => Promise.resolve("ran")), "ran");
    assert.deepEqual(await readdir(dir), []);
  });

  test("a lock that is released while waiting lets the second caller in", async () => {
    const file = join(dir, "expenses.json");
    await writeFile(lockPathFor(file), "123");
    setTimeout(() => void rm(lockPathFor(file), { force: true }), 80);
    assert.equal(await withLock(file, () => Promise.resolve("ran")), "ran");
  });
});
