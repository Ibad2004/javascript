import { clientIp } from "@/lib/clientIp";

describe("clientIp", () => {
  it("takes the first x-forwarded-for value", () => {
    expect(clientIp("203.0.113.7, 10.0.0.1")).toBe("203.0.113.7");
    expect(clientIp(" 2001:db8::1 ")).toBe("2001:db8::1");
  });

  it('is "unknown" when there is no value', () => {
    expect(clientIp(null)).toBe("unknown");
    expect(clientIp("")).toBe("unknown");
    expect(clientIp(" , 10.0.0.1")).toBe("unknown");
  });

  it("cuts a very long value", () => {
    expect(clientIp("1".repeat(500))).toHaveLength(64);
  });
});
