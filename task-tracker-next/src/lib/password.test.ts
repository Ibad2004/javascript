// @vitest-environment node
import bcrypt from "bcryptjs";
import { BCRYPT_COST, DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";

describe("passwords", () => {
  it("hashes with cost 12 and verifies", async () => {
    const hash = await hashPassword("DemoPass123");
    expect(bcrypt.getRounds(hash)).toBe(12);
    await expect(verifyPassword("DemoPass123", hash)).resolves.toBe(true);
    await expect(verifyPassword("DemoPass124", hash)).resolves.toBe(false);
  }, 20_000);

  it("compares against a real hash of the same cost when there is no user", async () => {
    expect(bcrypt.getRounds(DUMMY_HASH)).toBe(BCRYPT_COST);
    const compare = vi.spyOn(bcrypt, "compare");
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
    expect(compare).toHaveBeenCalledWith("anything", DUMMY_HASH);
  }, 20_000);

  it("does not accept extra text after bcrypt's 72 bytes", async () => {
    const base = "x".repeat(72);
    const hash = await hashPassword(base);
    await expect(verifyPassword(`${base}extra`, hash)).resolves.toBe(false);
  }, 20_000);
});
