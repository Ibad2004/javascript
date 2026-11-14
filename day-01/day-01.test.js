import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));

test("start script points at a numbered file that exists", () => {
  assert.match(pkg.scripts.start, /day-01\/index\.js/);
  assert.ok(existsSync(new URL("./index.js", import.meta.url)));
});

test("unused day script is gone", () => {
  assert.equal(pkg.scripts.day, undefined);
});

test("README has a What broke section", () => {
  assert.match(readFileSync(new URL("./README.md", import.meta.url), "utf8"), /What broke/);
});
