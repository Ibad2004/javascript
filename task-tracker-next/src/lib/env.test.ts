// @vitest-environment node
import { checkEnv } from "@/lib/env";

const SECRET = "test-only-secret-that-is-long-enough-123456";
const URI = "mongodb+srv://someone:hidden-pw@example.invalid/task-tracker-next";

function messageFrom(uri: string, secret: string): string {
  vi.stubEnv("MONGODB_URI", uri);
  vi.stubEnv("AUTH_SECRET", secret);
  try {
    checkEnv();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "not an Error";
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkEnv", () => {
  it("accepts a URI and a 32 character secret", () => {
    expect(messageFrom(URI, "x".repeat(32))).toBe("");
  });

  it("names a missing MONGODB_URI without showing the other value", () => {
    const message = messageFrom("", SECRET);
    expect(message).toContain("MONGODB_URI is not set");
    expect(message).not.toContain(SECRET);
  });

  it.each(["", "x".repeat(31)])("rejects a missing or short AUTH_SECRET without showing any value", (secret) => {
    const message = messageFrom(URI, secret);
    expect(message).toContain("AUTH_SECRET is missing or shorter than 32");
    expect(message).not.toContain("hidden-pw");
    if (secret !== "") expect(message).not.toContain(secret);
  });
});
