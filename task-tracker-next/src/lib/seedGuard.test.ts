// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSeedableDatabase } from "@/lib/seedGuard";

describe("seed guard", () => {
  it("allows only the local database", () => {
    expect(isSeedableDatabase("task-tracker-next")).toBe(true);
  });

  it.each(["task-tracker-next-prod", "Task-Tracker-Next", "task-tracker-next ", "task-tracker", "test", ""])(
    'refuses "%s"',
    (name) => {
      expect(isSeedableDatabase(name)).toBe(false);
    },
  );

  it("is checked by the seed script before its first write", () => {
    const script = readFileSync(resolve(process.cwd(), "scripts/seed.ts"), "utf8");
    const guard = script.indexOf("if (!isSeedableDatabase(name))");
    const firstWrite = script.search(/\.(init|create|insertMany|findOneAndUpdate|updateOne|deleteMany)\(/);
    expect(guard).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(guard);
  });
});
