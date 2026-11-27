// @vitest-environment node
import { login, logout, signup } from "@/app/actions/auth";
import { AUTH_MESSAGES } from "@/lib/authResult";
import { loginLimiter } from "@/lib/loginLimiter";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { findLoginByEmail, insertUser } from "@/lib/userData";

vi.mock("@/lib/password", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));
vi.mock("@/lib/session", () => ({ createSession: vi.fn(), deleteSession: vi.fn() }));
vi.mock("@/lib/userData", () => ({ findLoginByEmail: vi.fn(), insertUser: vi.fn() }));

const ID = "0123456789abcdef01234567";
const EMAIL = "a@example.com";

function form(email: string, password: string, next?: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  if (next !== undefined) data.set("next", next);
  return data;
}

/** The real redirect() throws an error whose digest holds the target URL. */
const redirectTo = (url: string) => ({ digest: expect.stringContaining(`;${url};`) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_SECRET", "test-only-secret-that-is-long-enough-123456");
  loginLimiter.clear(EMAIL);
  vi.mocked(hashPassword).mockResolvedValue("hashed");
  vi.mocked(insertUser).mockResolvedValue(ID);
  vi.mocked(findLoginByEmail).mockResolvedValue({ id: ID, passwordHash: "stored" });
  vi.mocked(verifyPassword).mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signup", () => {
  it("stores the hash (never the password), starts a session and goes to a safe next", async () => {
    await expect(signup({}, form(" A@Example.com ", "long enough", "/about"))).rejects.toMatchObject(redirectTo("/about"));
    expect(insertUser).toHaveBeenCalledWith(EMAIL, "hashed");
    expect(createSession).toHaveBeenCalledWith(ID);
  });

  it("reports a duplicate email without a session", async () => {
    vi.mocked(insertUser).mockResolvedValue(null);
    await expect(signup({}, form(EMAIL, "long enough"))).resolves.toEqual({
      fieldErrors: { email: AUTH_MESSAGES.emailTaken },
      email: EMAIL,
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("does not touch the database for invalid input or something that is not a form", async () => {
    await expect(signup({}, form("bad", "short"))).resolves.toHaveProperty("fieldErrors");
    await expect(signup({}, { email: EMAIL, password: "long enough" })).resolves.toHaveProperty("fieldErrors");
    expect(insertUser).not.toHaveBeenCalled();
  });

  it("creates no account when AUTH_SECRET is too short", async () => {
    vi.stubEnv("AUTH_SECRET", "short");
    await expect(signup({}, form(EMAIL, "long enough"))).rejects.toThrow("AUTH_SECRET is missing or shorter than 32");
    expect(insertUser).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  it("goes to /tasks instead of an outside next", async () => {
    await expect(login({}, form(EMAIL, "pw", "https://evil.com"))).rejects.toMatchObject(redirectTo("/tasks"));
    expect(createSession).toHaveBeenCalledWith(ID);
  });

  it("gives the same answer for a wrong password and an unknown email, and compares in both", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const wrong = await login({}, form(EMAIL, "pw"));
    vi.mocked(findLoginByEmail).mockResolvedValue(null);
    const unknown = await login({}, form(EMAIL, "pw"));
    expect(wrong).toEqual({ message: AUTH_MESSAGES.wrongCredentials, email: EMAIL });
    expect(unknown).toEqual(wrong);
    expect(vi.mocked(verifyPassword).mock.calls).toEqual([["pw", "stored"], ["pw", null]]);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("blocks after 5 failures, even with the right password", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    for (let i = 0; i < 5; i += 1) await login({}, form(EMAIL, "pw"));
    vi.mocked(verifyPassword).mockResolvedValue(true);
    await expect(login({}, form("A@EXAMPLE.COM", "pw"))).resolves.toMatchObject({
      message: AUTH_MESSAGES.tooManyAttempts,
    });
    expect(verifyPassword).toHaveBeenCalledTimes(5);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("limits requests sent at the same moment too", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    await Promise.all(Array.from({ length: 20 }, () => login({}, form(EMAIL, "pw"))));
    expect(verifyPassword).toHaveBeenCalledTimes(5);
  });

  it("hides database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(findLoginByEmail).mockRejectedValue(new Error("secret host"));
    await expect(login({}, form(EMAIL, "pw"))).resolves.toEqual({ message: AUTH_MESSAGES.failed, email: EMAIL });
  });
});

describe("logout", () => {
  it("deletes the session and goes to /login", async () => {
    await expect(logout()).rejects.toMatchObject(redirectTo("/login"));
    expect(deleteSession).toHaveBeenCalled();
  });
});
