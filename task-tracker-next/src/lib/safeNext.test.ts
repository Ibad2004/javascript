import { loginPath, safeNextPath } from "@/lib/safeNext";

describe("safeNextPath", () => {
  it.each(["/tasks", "/about", "/tasks/0123456789abcdef01234567", "/tasks?status=done&q=c%2B%2B"])(
    "keeps the local path %j",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.com",
    "http://evil.com/tasks",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/..//evil.com",
    "/%2e%2e//evil.com",
    "javascript:alert(1)",
    "evil.com",
    " /tasks",
    "",
    `/${"a".repeat(2000)}`,
    undefined,
    null,
    ["/tasks"],
  ])("replaces %j with /tasks", (next) => {
    expect(safeNextPath(next)).toBe("/tasks");
  });
});

describe("loginPath", () => {
  it("encodes the path to come back to", () => {
    expect(loginPath("/tasks?status=done&q=a")).toBe("/login?next=%2Ftasks%3Fstatus%3Ddone%26q%3Da");
  });

  it("never carries an unsafe path", () => {
    expect(loginPath("//evil.com")).toBe("/login?next=%2Ftasks");
  });
});
