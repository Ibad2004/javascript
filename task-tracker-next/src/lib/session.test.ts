// @vitest-environment node
import { cookies } from "next/headers";
import { createSession, getCurrentUser, requirePageUser, requireUser } from "@/lib/session";
import { signSessionToken } from "@/lib/sessionToken";
import { findUserById } from "@/lib/userData";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/userData", () => ({ findUserById: vi.fn() }));

const USER = { id: "0123456789abcdef01234567", email: "a@example.com" };
const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };

function withCookie(value: string | undefined) {
  store.get.mockReturnValue(value === undefined ? undefined : { name: "session", value });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_SECRET", "test-only-secret-that-is-long-enough-123456");
  // Only get/set/delete of the real cookie store are used.
  const cookieStore: Partial<Awaited<ReturnType<typeof cookies>>> = store;
  vi.mocked<() => Promise<typeof cookieStore>>(cookies).mockResolvedValue(cookieStore);
  vi.mocked(findUserById).mockResolvedValue(USER);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getCurrentUser", () => {
  it("returns the user for a valid cookie", async () => {
    withCookie(await signSessionToken(USER.id));
    await expect(getCurrentUser()).resolves.toEqual(USER);
    expect(findUserById).toHaveBeenCalledWith(USER.id);
  });

  it.each([undefined, "", "not-a-token"])("is logged out for the cookie %j", async (value) => {
    withCookie(value);
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("is logged out when the account no longer exists", async () => {
    withCookie(await signSessionToken(USER.id));
    vi.mocked(findUserById).mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("requireUser and requirePageUser", () => {
  it("redirect a logged-out visitor", async () => {
    withCookie(undefined);
    await expect(requireUser()).rejects.toMatchObject({ digest: expect.stringContaining(";/login;") });
    await expect(requirePageUser("/about")).rejects.toMatchObject({
      digest: expect.stringContaining(";/login?next=%2Fabout;"),
    });
  });
});

describe("createSession", () => {
  it("sets an httpOnly, lax cookie for the whole site, secure only in production", async () => {
    await createSession(USER.id);
    expect(store.set).toHaveBeenLastCalledWith("session", expect.any(String),
      { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 604800 });
    vi.stubEnv("NODE_ENV", "production");
    await createSession(USER.id);
    expect(store.set).toHaveBeenLastCalledWith("session", expect.any(String), expect.objectContaining({ secure: true }));
  });
});
