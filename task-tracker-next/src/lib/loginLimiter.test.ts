import { MAX_FAILURES, WINDOW_MS, createLoginLimiter } from "@/lib/loginLimiter";

function setup() {
  let time = 1_000_000;
  const limiter = createLoginLimiter(() => time);
  const fail = (email: string, times: number) => Array.from({ length: times }, () => limiter.tryAttempt(email));
  return { limiter, fail, wait: (ms: number) => { time += ms; } };
}

describe("login limiter", () => {
  it("allows 5 attempts and blocks the 6th", () => {
    const { limiter, fail } = setup();
    expect(fail("a@x.com", MAX_FAILURES)).toEqual([true, true, true, true, true]);
    expect(limiter.tryAttempt("a@x.com")).toBe(false);
  });

  it("counts each email separately", () => {
    const { limiter, fail } = setup();
    fail("a@x.com", MAX_FAILURES);
    expect(limiter.tryAttempt("b@x.com")).toBe(true);
  });

  it("unblocks after 15 minutes, and blocked tries do not extend the block", () => {
    const { limiter, fail, wait } = setup();
    fail("a@x.com", MAX_FAILURES);
    wait(WINDOW_MS - 1);
    expect(limiter.tryAttempt("a@x.com")).toBe(false);
    wait(1);
    expect(limiter.tryAttempt("a@x.com")).toBe(true);
  });

  it("forgets only the failures older than the window", () => {
    const { fail, wait } = setup();
    fail("a@x.com", 1);
    wait(10 * 60 * 1000);
    fail("a@x.com", 4);
    wait(5 * 60 * 1000); // the first one is now 15 minutes old
    expect(fail("a@x.com", 2)).toEqual([true, false]);
  });

  it("starts again after a successful login", () => {
    const { limiter, fail } = setup();
    fail("a@x.com", 4);
    limiter.clear("a@x.com");
    expect(fail("a@x.com", MAX_FAILURES)).not.toContain(false);
  });
});
