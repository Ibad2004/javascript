import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTask, deleteTask, toggleTask, updateTask } from "@/app/actions/tasks";
import { ACTION_MESSAGES, saveFailed, succeeded, taskGone } from "@/lib/actionResult";
import { requireUser } from "@/lib/session";
import { insertTask, removeTask, saveTask, toggleTaskDone } from "@/lib/taskData";

// The session, the data layer and Next.js are mocked: no database is used.
vi.mock("@/lib/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/taskData", () => ({
  insertTask: vi.fn(),
  saveTask: vi.fn(),
  toggleTaskDone: vi.fn(),
  removeTask: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: vi.fn(),
}));

const ID = "0123456789abcdef01234567";
const USER = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", email: "a@example.com" };
const input = { title: " Read ", description: "", priority: "high", dueDate: "2026-12-01", done: true };
const parsed = { title: "Read", description: "", priority: "high", dueDate: "2026-12-01" };

const writes = [insertTask, saveTask, toggleTaskDone, removeTask];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue(USER);
  vi.mocked(insertTask).mockResolvedValue(ID);
  vi.mocked(saveTask).mockResolvedValue(true);
  vi.mocked(toggleTaskDone).mockResolvedValue(true);
  vi.mocked(removeTask).mockResolvedValue(true);
});

function expectRevalidated() {
  expect(revalidatePath).toHaveBeenCalledWith("/tasks");
  expect(revalidatePath).toHaveBeenCalledWith(`/tasks/${ID}`);
}

describe("createTask", () => {
  it("saves only the validated fields and revalidates", async () => {
    await expect(createTask(input)).resolves.toEqual(succeeded());
    expect(insertTask).toHaveBeenCalledWith(USER.id, parsed);
    expectRevalidated();
  });

  it("does not touch the database for invalid input", async () => {
    const result = await createTask({ ...input, title: "  ", priority: "urgent" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { title: expect.any(String), priority: expect.any(String) } });
    expect(insertTask).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTask", () => {
  it("saves the validated fields", async () => {
    await expect(updateTask(ID, input)).resolves.toEqual(succeeded());
    expect(saveTask).toHaveBeenCalledWith(USER.id, ID, parsed);
    expectRevalidated();
  });

  it("returns field errors for invalid input", async () => {
    const result = await updateTask(ID, { ...input, dueDate: "2026-02-30" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { dueDate: expect.any(String) } });
    expect(saveTask).not.toHaveBeenCalled();
  });
});

describe("a bad id", () => {
  it.each(["bad-id", "", "aaaaaaaaaaaa", 5, null, { $ne: null }])("is 'gone' for every action (%j)", async (id) => {
    const results = await Promise.all([updateTask(id, input), toggleTask(id), deleteTask(id, true)]);
    expect(results).toEqual([taskGone(), taskGone(), taskGone()]);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("a task that no longer exists", () => {
  it("is reported by update, toggle and delete without revalidating or redirecting", async () => {
    vi.mocked(saveTask).mockResolvedValue(false);
    vi.mocked(toggleTaskDone).mockResolvedValue(false);
    vi.mocked(removeTask).mockResolvedValue(false);
    const results = [await updateTask(ID, input), await toggleTask(ID), await deleteTask(ID, true)];
    expect(results).toEqual([taskGone(), taskGone(), taskGone()]);
    expect(results[0]).toMatchObject({ message: ACTION_MESSAGES.gone });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("an unreachable database", () => {
  it("gives the friendly result from all four actions", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const write of writes) vi.mocked(write).mockRejectedValue(new Error("secret host"));
    const results = [await createTask(input), await updateTask(ID, input), await toggleTask(ID), await deleteTask(ID, true)];
    expect(results).toEqual([saveFailed(), saveFailed(), saveFailed(), saveFailed()]);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("toggleTask and deleteTask", () => {
  it("toggle revalidates", async () => {
    await expect(toggleTask(ID)).resolves.toEqual(succeeded());
    expect(toggleTaskDone).toHaveBeenCalledWith(USER.id, ID);
    expectRevalidated();
  });

  it("delete from the list does not redirect", async () => {
    await expect(deleteTask(ID)).resolves.toEqual(succeeded());
    expect(removeTask).toHaveBeenCalledWith(USER.id, ID);
    expectRevalidated();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("delete from the task page redirects to the list, after revalidating", async () => {
    await deleteTask(ID, true);
    expectRevalidated();
    expect(redirect).toHaveBeenCalledWith("/tasks");
  });

  it("only the value true redirects, never a URL from the caller", async () => {
    await deleteTask(ID, "https://example.com");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("logged out", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["createTask", () => createTask(input)],
    ["updateTask", () => updateTask(ID, input)],
    ["toggleTask", () => toggleTask(ID)],
    ["deleteTask", () => deleteTask(ID, true)],
    ["createTask with invalid input", () => createTask({})],
    ["updateTask with a bad id", () => updateTask("bad-id", input)],
  ];

  it.each(calls)("%s is rejected before anything is read or written", async (_name, call) => {
    // What the real requireUser() does: redirect() throws. runSafely must let it through.
    const real = await vi.importActual<typeof import("next/navigation")>("next/navigation");
    vi.mocked(requireUser).mockImplementation(async () => real.redirect("/login"));

    await expect(call()).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});