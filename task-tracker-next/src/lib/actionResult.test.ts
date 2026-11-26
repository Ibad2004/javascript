import { ACTION_MESSAGES, invalidInput, runSafely, saveFailed, succeeded, taskGone } from "@/lib/actionResult";

describe("action result helpers", () => {
  it("builds the typed results", () => {
    expect(succeeded()).toEqual({ ok: true });
    expect(taskGone()).toEqual({ ok: false, message: ACTION_MESSAGES.gone });
    expect(saveFailed()).toEqual({ ok: false, message: ACTION_MESSAGES.failed });
    expect(invalidInput({ title: "Bad" })).toEqual({
      ok: false,
      message: ACTION_MESSAGES.invalid,
      fieldErrors: { title: "Bad" },
    });
  });

  it("passes the result of the work through", async () => {
    await expect(runSafely(async () => taskGone())).resolves.toEqual(taskGone());
  });

  it("hides the database error from the result and from the log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secret = "connect failed: db.example.invalid";
    const result = await runSafely(async () => {
      throw new TypeError(secret);
    });
    expect(result).toEqual(saveFailed());
    expect(JSON.stringify([result, log.mock.calls])).not.toContain(secret);
  });
});
