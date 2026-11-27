// @vitest-environment node
// (jose checks Uint8Array, which jsdom replaces with its own.)
import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { SESSION_SECONDS, getSessionKey, signSessionToken, verifySessionToken } from "@/lib/sessionToken";

const SECRET = "test-only-secret-that-is-long-enough-123456";
const ID = "0123456789abcdef01234567";

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session token", () => {
  it("round-trips the user id, signed with HS256 for 7 days", async () => {
    const token = await signSessionToken(ID);
    await expect(verifySessionToken(token)).resolves.toBe(ID);
    expect(decodeProtectedHeader(token).alg).toBe("HS256");
    const { sub, iat = 0, exp = 0 } = decodeJwt(token);
    expect(sub).toBe(ID);
    expect(exp - iat).toBe(SESSION_SECONDS);
    expect(SESSION_SECONDS).toBe(604800);
  });

  it("rejects a changed payload", async () => {
    const [header = "", , signature = ""] = (await signSessionToken(ID)).split(".");
    const other = (await signSessionToken("f".repeat(24))).split(".")[1];
    await expect(verifySessionToken(`${header}.${other}.${signature}`)).resolves.toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSessionToken(ID);
    vi.stubEnv("AUTH_SECRET", `${SECRET}-different`);
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await expect(verifySessionToken(await signSessionToken(ID, eightDaysAgo))).resolves.toBeNull();
  });

  it("rejects an unsigned token, other algorithms, a missing expiry and a bad subject", async () => {
    const none = `${btoa('{"alg":"none"}')}.${btoa(`{"sub":"${ID}","exp":9999999999}`)}.`.replaceAll("=", "");
    const hs512 = await new SignJWT().setProtectedHeader({ alg: "HS512" }).setSubject(ID).setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET.repeat(2)));
    const forever = await new SignJWT().setProtectedHeader({ alg: "HS256" }).setSubject(ID).sign(getSessionKey());
    const badSubject = await signSessionToken("not-an-id");
    for (const token of [none, hs512, forever, badSubject, "", "a.b.c"]) {
      await expect(verifySessionToken(token)).resolves.toBeNull();
    }
  });
});

describe("AUTH_SECRET", () => {
  it.each([undefined, "", "x".repeat(31), "<generate a long random string>"])(
    "fails with a clear message for %j",
    async (secret) => {
      vi.stubEnv("AUTH_SECRET", secret);
      const message = "AUTH_SECRET is missing or shorter than 32 characters";
      expect(() => getSessionKey()).toThrow(message);
      await expect(signSessionToken(ID)).rejects.toThrow(message);
      // Not "logged out": a broken setup must be noticed.
      await expect(verifySessionToken("a.b.c")).rejects.toThrow(message);
    },
  );
});
