// @vitest-environment node
// Checks that EVERY task query is limited to the owner. The model is mocked.
import { DEFAULT_FILTERS } from "@/lib/filters";
import { getTaskById, getTaskCounts, getTasks, insertTask, removeTask, saveTask, toggleTaskDone } from "@/lib/taskData";
import type { TaskInput } from "@/types";

const model = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  countDocuments: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
}));
vi.mock("@/models/Task", () => ({ TaskModel: model }));
vi.mock("@/lib/db", () => ({ connectDb: vi.fn() }));

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ID = "0123456789abcdef01234567";
const input: TaskInput = { title: "T", description: "", priority: "low", dueDate: null };
const lean = (value: unknown) => ({ lean: () => Promise.resolve(value) });

beforeEach(() => {
  vi.resetAllMocks();
  model.find.mockReturnValue(lean([]));
  model.findOne.mockReturnValue(lean(null));
  model.findOneAndUpdate.mockReturnValue(lean(null));
  model.findOneAndDelete.mockReturnValue(lean(null));
  model.countDocuments.mockResolvedValue(0);
  model.create.mockResolvedValue({ _id: { toString: () => ID } });
});

describe("every query filters by owner", () => {
  it("list", async () => {
    await getTasks(OWNER, { ...DEFAULT_FILTERS, status: "done" });
    expect(model.find).toHaveBeenCalledWith({ owner: OWNER, done: true });
  });

  it("counts", async () => {
    await getTaskCounts(OWNER);
    expect(model.countDocuments.mock.calls).toEqual([[{ owner: OWNER }], [{ owner: OWNER, done: true }]]);
  });

  it("get by id (nothing found = null)", async () => {
    await expect(getTaskById(OWNER, ID)).resolves.toBeNull();
    expect(model.findOne).toHaveBeenCalledWith({ _id: ID, owner: OWNER });
  });

  it("insert sets the owner from the session", async () => {
    await insertTask(OWNER, input);
    expect(model.create).toHaveBeenCalledWith({ ...input, done: false, owner: OWNER });
  });

  it("update never writes the owner", async () => {
    await expect(saveTask(OWNER, ID, input)).resolves.toBe(false);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ _id: ID, owner: OWNER }, { $set: input });
  });

  it("toggle", async () => {
    await expect(toggleTaskDone(OWNER, ID)).resolves.toBe(false);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ _id: ID, owner: OWNER }, expect.any(Array), { updatePipeline: true });
  });

  it("delete", async () => {
    await expect(removeTask(OWNER, ID)).resolves.toBe(false);
    expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: ID, owner: OWNER });
  });
});
