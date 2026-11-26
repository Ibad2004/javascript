import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createTask } from "@/app/actions/tasks";
import { ACTION_MESSAGES, invalidInput, saveFailed, succeeded, type ActionResult } from "@/lib/actionResult";
import { AddTaskForm } from "./AddTaskForm";

// The real action needs a server and a database.
vi.mock("@/app/actions/tasks", () => ({ createTask: vi.fn() }));

const title = () => screen.getByLabelText("Title");
const type = (value: string) => fireEvent.change(title(), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Add task" }));

beforeEach(() => {
  vi.mocked(createTask).mockReset().mockResolvedValue(succeeded());
});

describe("AddTaskForm", () => {
  it("shows an error, focuses the title and does not call the action when it is empty", () => {
    render(<AddTaskForm />);
    expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
    submit();
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(title()).toHaveFocus();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("rejects a title over 100 characters", () => {
    render(<AddTaskForm />);
    type("x".repeat(101));
    submit();
    expect(screen.getByText(/100 characters or less/)).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("saves, clears the form, focuses the title and says so", async () => {
    render(<AddTaskForm />);
    type("Read");
    submit();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Task added."));
    expect(createTask).toHaveBeenCalledWith({ title: "Read", description: "", priority: "medium", dueDate: "" });
    expect(title()).toHaveValue("");
    expect(title()).toHaveFocus();
    expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
  });

  it("is disabled while saving, so a double submit saves only once", async () => {
    let finish: (result: ActionResult) => void = () => undefined;
    vi.mocked(createTask).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { container } = render(<AddTaskForm />);
    type("Read");
    submit();
    const button = await screen.findByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    const form = container.querySelector("form");
    if (form === null) throw new Error("no form");
    fireEvent.submit(form); // Enter in a field
    finish(succeeded());
    await screen.findByRole("button", { name: "Add task" });
    expect(createTask).toHaveBeenCalledTimes(1);
  });

  it("keeps the typed text and shows a message when saving fails", async () => {
    vi.mocked(createTask).mockResolvedValue(saveFailed());
    render(<AddTaskForm />);
    type("Keep me");
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(ACTION_MESSAGES.failed);
    expect(title()).toHaveValue("Keep me");
  });

  it("keeps the text when the request itself fails", async () => {
    vi.mocked(createTask).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AddTaskForm />);
    type("Keep me");
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(ACTION_MESSAGES.failed);
    expect(title()).toHaveValue("Keep me");
  });

  it("shows the server's field errors until that field changes", async () => {
    vi.mocked(createTask).mockResolvedValue(invalidInput({ priority: "Choose low, medium or high" }));
    render(<AddTaskForm />);
    type("Read");
    submit();
    expect(await screen.findByText("Choose low, medium or high")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
    expect(screen.queryByText("Choose low, medium or high")).not.toBeInTheDocument();
  });
});
