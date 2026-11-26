import { parseTaskInput } from "@/lib/taskSchema";
import { DESCRIPTION_MAX, MESSAGES, TITLE_MAX } from "@/lib/tasks";

const good = { title: "Read", description: "", priority: "low", dueDate: "" };

const errorsFor = (patch: Record<string, unknown>) => {
  const result = parseTaskInput({ ...good, ...patch });
  return result.ok ? {} : result.fieldErrors;
};

describe("parseTaskInput", () => {
  it("trims the text and turns an empty due date into null", () => {
    expect(parseTaskInput({ ...good, title: "  Read  ", description: " notes " })).toEqual({
      ok: true,
      data: { title: "Read", description: "notes", priority: "low", dueDate: null },
    });
  });

  it("drops unknown fields such as done and _id", () => {
    expect(parseTaskInput({ ...good, done: true, _id: "x", $where: "1" })).toEqual({
      ok: true,
      data: { title: "Read", description: "", priority: "low", dueDate: null },
    });
  });

  it.each(["", "     "])("requires a title (%j)", (title) => {
    expect(errorsFor({ title })).toEqual({ title: MESSAGES.titleRequired });
  });

  it("allows exactly the title limit, also in emoji, and not one more", () => {
    expect(errorsFor({ title: "🛒".repeat(TITLE_MAX) })).toEqual({});
    expect(errorsFor({ title: "x".repeat(TITLE_MAX + 1) })).toEqual({ title: MESSAGES.titleTooLong });
  });

  it("limits the description", () => {
    expect(errorsFor({ description: "x".repeat(DESCRIPTION_MAX) })).toEqual({});
    expect(errorsFor({ description: "x".repeat(DESCRIPTION_MAX + 1) })).toEqual({
      description: MESSAGES.descriptionTooLong,
    });
  });

  it.each(["2026-02-30", "2026-13-01", "30/02/2026", "tomorrow", "0999-01-01"])("rejects the date %s", (dueDate) => {
    expect(errorsFor({ dueDate })).toEqual({ dueDate: MESSAGES.invalidDate });
  });

  it("accepts a real leap day", () => {
    expect(errorsFor({ dueDate: "2028-02-29" })).toEqual({});
  });

  it.each(["urgent", "HIGH", "", 3, undefined])("rejects the priority %j", (priority) => {
    expect(errorsFor({ priority })).toEqual({ priority: MESSAGES.invalidPriority });
  });

  it("rejects values that are not text", () => {
    expect(errorsFor({ title: { $ne: null }, description: 5, dueDate: ["2026-01-01"] })).toEqual({
      title: MESSAGES.titleRequired,
      description: MESSAGES.invalidDescription,
      dueDate: MESSAGES.invalidDate,
    });
  });

  it.each([null, undefined, "Read", 7])("reports every field for %j instead of crashing", (raw) => {
    const result = parseTaskInput(raw);
    expect(result.ok ? [] : Object.keys(result.fieldErrors).sort()).toEqual([
      "description",
      "dueDate",
      "priority",
      "title",
    ]);
  });
});
