import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, test } from "node:test";
import { loadStore, parseStore, saveStore } from "../src/storage.js";

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
