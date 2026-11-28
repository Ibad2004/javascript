// @vitest-environment node
import { countAttempt, deleteAttempts } from "@/lib/attemptData";
import {
  MAX_FAILURES,
  MAX_SIGNUPS,
  SIGNUP_WINDOW_MS,
  WINDOW_MS,
  clearLoginAttempts,
  tryLoginAttempt,
  trySignupAttempt,
} from "@/lib/loginLimiter";
import { fakeAttemptStore } from "@/test/fakeAttemptStore";

vi.mock("@/lib/attemptData", () => ({ countAttempt: vi.fn(), deleteAttempts: vi.fn() }));

const IP = "203.0.113.7";
const OTHER_IP = "198.51.100.2";
const store = fakeAttemptStore();

async function logins(email: string, ip: string, times: number): Promise<boolean[]> {
  const results: boolean[] = [];
  for (let i = 0; i < times; i += 1) results.push(await tryLoginAttempt(email, ip));
  return results;
}

beforeEach(() => {
  vi.resetAllMocks();
  store.reset();
  vi.mocked(countAttempt).mockImplementation(store.countAttempt);
  vi.mocked(deleteAttempts).mockImplementation(store.deleteAttempts);
});

describe("login limit", () => {
  it("allows 5 attempts and blocks the 6th", async () => {
    await expect(logins("a@x.com", IP, MAX_FAILURES + 1)).resolves.toEqual([true, true, true, true, true, false]);
  });

  it("uses email + address as the key, with a 15 minute window", async () => {
    await tryLoginAttempt("a@x.com", IP);
    expect(countAttempt).toHaveBeenCalledWith(`login:a@x.com|${IP}`, 5, WINDOW_MS);
    expect(WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it("does not block the same email from another address, or another email from this one", async () => {
    await logins("a@x.com", IP, MAX_FAILURES + 1);
    await expect(tryLoginAttempt("a@x.com", OTHER_IP)).resolves.toBe(true);
    await expect(tryLoginAttempt("b@x.com", IP)).resolves.toBe(true);
  });

  it("starts again after a successful login, for that key only", async () => {
    await logins("a@x.com", IP, MAX_FAILURES);
    await logins("a@x.com", OTHER_IP, MAX_FAILURES);
    await clearLoginAttempts("a@x.com", IP);
    await expect(logins("a@x.com", IP, MAX_FAILURES)).resolves.not.toContain(false);
    await expect(tryLoginAttempt("a@x.com", OTHER_IP)).resolves.toBe(false);
  });
});

describe("sign-up limit", () => {
  it("allows 10 per address per hour and blocks the 11th", async () => {
    for (let i = 0; i < MAX_SIGNUPS; i += 1) await expect(trySignupAttempt(IP)).resolves.toBe(true);
    await expect(trySignupAttempt(IP)).resolves.toBe(false);
    await expect(trySignupAttempt(OTHER_IP)).resolves.toBe(true);
    expect(countAttempt).toHaveBeenCalledWith(`signup:${IP}`, 10, SIGNUP_WINDOW_MS);
    expect(SIGNUP_WINDOW_MS).toBe(60 * 60 * 1000);
  });
});
