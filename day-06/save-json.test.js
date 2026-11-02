import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { saveJson } from "./save-json.js";

let tempRoot;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "day-06-save-json-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

test("creates a missing folder and writes pretty JSON with a final newline", async () => {
  const filePath = path.join(tempRoot, "a", "b", "data.json");
  const data = { users: [{ id: 1, name: "Leanne" }], total: 1 };
  const returned = await saveJson(filePath, data);

  const text = await readFile(filePath, "utf8");
  assert.equal(returned, filePath);
  assert.equal(text, `${JSON.stringify(data, null, 2)}\n`);
  assert.ok(text.endsWith("}\n"));
  assert.deepEqual(JSON.parse(text), data);
});

test("leaves no temp file behind", async () => {
  const filePath = path.join(tempRoot, "data.json");
  await saveJson(filePath, [1, 2, 3]);
  assert.deepEqual(await readdir(tempRoot), ["data.json"]);
});

test("replaces an existing file", async () => {
  const filePath = path.join(tempRoot, "data.json");
  await writeFile(filePath, "old content");
  await saveJson(filePath, { fresh: true });
  assert.deepEqual(JSON.parse(await readFile(filePath, "utf8")), { fresh: true });
  assert.deepEqual(await readdir(tempRoot), ["data.json"]);
});

test("saves empty arrays, empty objects, null and numbers", async () => {
  const filePath = path.join(tempRoot, "data.json");
  for (const data of [[], {}, null, 0, "text"]) {
    await saveJson(filePath, data);
    assert.deepEqual(JSON.parse(await readFile(filePath, "utf8")), data);
  }
});

test("rejects circular data with a clear TypeError and writes nothing", async () => {
  const filePath = path.join(tempRoot, "data.json");
  const data = { name: "loop" };
  data.self = data;
  await assert.rejects(saveJson(filePath, data), (error) => {
    assert.ok(error instanceof TypeError);
    assert.match(error.message, /^data cannot be turned into JSON: /);
    return true;
  });
  assert.deepEqual(await readdir(tempRoot), []);
});

test("rejects undefined, a function, a symbol and a BigInt", async () => {
  const filePath = path.join(tempRoot, "data.json");
  for (const data of [undefined, () => {}, Symbol("x"), 10n]) {
    await assert.rejects(saveJson(filePath, data), /^TypeError: data cannot be turned into JSON/);
  }
  assert.deepEqual(await readdir(tempRoot), []);
});

test("rejects a missing or blank file path", async () => {
  for (const filePath of [undefined, null, "", "   ", 42]) {
    await assert.rejects(saveJson(filePath, {}), /filePath must be a non-empty string/);
  }
});
