import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

interface Rule {
  readonly name: string;
  readonly pattern: RegExp;
  readonly sample: string;
}

const PROJECT_ROOT = path.join(import.meta.dirname, "..", "..");
const SCANNED_FOLDERS = ["src", "tests"] as const;
const THIS_FILE = "source.test.ts";

const RULES: readonly Rule[] = [
  { name: "the any type", pattern: /\bany\b/, sample: "const rows: Record<string, any> = {};" },
  { name: "a ts-ignore style comment", pattern: /@ts-(ignore|expect-error|nocheck)/, sample: "// @ts-expect-error" },
  { name: "a double assertion", pattern: /\bas\s+unknown\s+as\b/, sample: "const user = data as unknown as ApiUser;" },
  { name: "a type assertion", pattern: /^(?!\s*import\b).*\bas\s+(?!const\b)[\w{[(]/, sample: "const user = data as ApiUser;" },
  { name: "a non-null assertion", pattern: /[\w)\]]!(?!=)/, sample: "const name = users[0]!.name;" },
];

const withoutStrings = (code: string): string =>
  code.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');

async function sourceFiles(): Promise<string[]> {
  const lists = await Promise.all(
    SCANNED_FOLDERS.map(async (folder) => {
      const names = await readdir(path.join(PROJECT_ROOT, folder));
      return names.filter((name) => name.endsWith(".ts") && name !== THIS_FILE).map((name) => `${folder}/${name}`);
    }),
  );
  return lists.flat();
}

function findViolations(file: string, code: string): string[] {
  return withoutStrings(code)
    .split("\n")
    .flatMap((line, index) =>
      RULES.filter((rule) => rule.pattern.test(line)).map((rule) => `${file}:${index + 1} uses ${rule.name}`),
    );
}

describe("source rules", () => {
  test("every rule catches its own bad sample", () => {
    for (const rule of RULES) {
      assert.match(withoutStrings(rule.sample), rule.pattern, rule.name);
    }
  });

  test("allowed code is not flagged", () => {
    const allowed = [
      "const config = Object.freeze({ maxAttempts: 3 } as const);",
      "if (!isObject(user) || a !== b) return [];",
      'test("valid JSON is not treated as empty", () => {});',
      'import { setTimeout as delay } from "node:timers/promises";',
    ];
    assert.deepEqual(
      allowed.flatMap((line) => findViolations("sample.ts", line)),
      [],
    );
  });

  test("src and tests have .ts files to scan", async () => {
    const files = await sourceFiles();
    assert.ok(files.includes("src/summary.ts"));
    assert.ok(files.includes("tests/summary.test.ts"));
  });

  test("no any, ts-ignore, assertions or non-null assertions in src or tests", async () => {
    const files = await sourceFiles();
    const violations = await Promise.all(
      files.map(async (file) => findViolations(file, await readFile(path.join(PROJECT_ROOT, file), "utf8"))),
    );
    assert.deepEqual(violations.flat(), []);
  });
});
