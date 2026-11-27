// @vitest-environment node
import { AUTH_MESSAGES } from "@/lib/authResult";
import { loginSchema, parseCredentials, signupSchema } from "@/lib/authSchema";

const signup = (email: unknown, password: unknown) => parseCredentials(signupSchema, { email, password });

describe("signupSchema", () => {
  it("trims and lowercases the email, and leaves the password alone", () => {
    expect(signup("  Demo@Example.COM ", " pass word ")).toEqual({
      ok: true,
      data: { email: "demo@example.com", password: " pass word " },
    });
  });

  it.each(["", "nope", "a@b", "a b@example.com", `${"a".repeat(250)}@example.com`, undefined, 5, { $ne: null }])(
    "rejects the email %j",
    (email) => {
      expect(signup(email, "long enough")).toEqual({ ok: false, fieldErrors: { email: AUTH_MESSAGES.invalidEmail } });
    },
  );

  it.each([
    ["x".repeat(7), AUTH_MESSAGES.passwordTooShort],
    ["x".repeat(73), AUTH_MESSAGES.passwordTooLong],
    ["é".repeat(37), AUTH_MESSAGES.passwordTooLong], // 37 characters, 74 bytes
    [" ".repeat(10), AUTH_MESSAGES.passwordBlank],
    [undefined, AUTH_MESSAGES.passwordRequired],
  ])("rejects the password %j", (password, message) => {
    expect(signup("a@example.com", password)).toEqual({ ok: false, fieldErrors: { password: message } });
  });

  it.each(["x".repeat(8), "x".repeat(72), "é".repeat(36)])("accepts the password %j", (password) => {
    expect(signup("a@example.com", password).ok).toBe(true);
  });

  it("treats something that is not an object as an empty form", () => {
    expect(parseCredentials(signupSchema, null)).toMatchObject({ ok: false });
  });
});

describe("loginSchema", () => {
  it("only asks for a password, without the signup rules", () => {
    expect(parseCredentials(loginSchema, { email: "A@example.com", password: "x" }).ok).toBe(true);
    expect(parseCredentials(loginSchema, { email: "a@example.com", password: "" })).toEqual({
      ok: false,
      fieldErrors: { password: AUTH_MESSAGES.passwordRequired },
    });
  });
});
