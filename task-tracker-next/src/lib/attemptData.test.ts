// @vitest-environment node
// The database is mocked: this checks what is sent to it.
import { countAttempt } from "@/lib/attemptData";
import { LoginAttemptModel } from "@/models/LoginAttempt";

const lean = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ connectDb: vi.fn() }));
vi.mock("@/models/LoginAttempt", () => ({
  LoginAttemptModel: { init: vi.fn(), findOneAndUpdate: vi.fn(() => ({ orFail: () => ({ lean }) })) },
}));

beforeEach(() => {
  lean.mockReset();
  vi.mocked(LoginAttemptModel.findOneAndUpdate).mockClear();
});

describe("countAttempt", () => {
  it("counts in one upsert, with a new window only when the old one is over", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    vi.useFakeTimers({ now });
    lean.mockResolvedValue({ count: 1 });
    await expect(countAttempt("k", 5, 60_000)).resolves.toBe(1);

    const open = { $gt: ["$expiresAt", now] };
    expect(LoginAttemptModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "k" },
      [
        {
          $set: {
            count: { $cond: [open, { $min: [{ $add: ["$count", 1] }, 6] }, 1] },
            expiresAt: { $cond: [open, "$expiresAt", new Date("2026-01-01T00:01:00Z")] },
          },
        },
      ],
      { upsert: true, returnDocument: "after", updatePipeline: true },
    );
  });

  it("tries once more when two requests create the counter together", async () => {
    lean.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: 11000 })).mockResolvedValue({ count: 2 });
    await expect(countAttempt("k", 5, 60_000)).resolves.toBe(2);
    expect(lean).toHaveBeenCalledTimes(2);
  });

  it("does not swallow other database errors, so the limit never fails open", async () => {
    lean.mockRejectedValue(new Error("down"));
    await expect(countAttempt("k", 5, 60_000)).rejects.toThrow("down");
  });
});
