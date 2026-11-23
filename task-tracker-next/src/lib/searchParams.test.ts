import { parseSearchParams } from "./searchParams";

describe("parseSearchParams", () => {
  it("falls back to the defaults for bad values", () => {
    expect(parseSearchParams({ status: "weird", priority: ["nope"], q: undefined })).toEqual({
      status: "all",
      priority: "any",
      q: "",
    });
  });

  it("reads good values, case-insensitively, and uses the first of a repeated param", () => {
    expect(parseSearchParams({ status: "DONE", priority: ["high", "low"], q: "c++" })).toEqual({
      status: "done",
      priority: "high",
      q: "c++",
    });
  });

  it("cuts q to 100 characters and keeps Urdu", () => {
    expect(parseSearchParams({ q: "x".repeat(300) }).q).toHaveLength(100);
    expect(parseSearchParams({ q: "اردو" }).q).toBe("اردو");
  });
});
