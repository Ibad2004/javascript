import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordField } from "./PasswordField";
import { TaskList } from "./TaskList";
import { makeTask } from "@/test/makeTask";

// TaskItem has buttons that import the server actions and use the router.
vi.mock("@/app/actions/tasks", () => ({ toggleTask: vi.fn(), deleteTask: vi.fn() }));

describe("PasswordField", () => {
  it("toggles between hidden and visible", async () => {
    render(<PasswordField autoComplete="current-password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });
});

describe("TaskList empty states", () => {
  it("says No tasks yet when there are none at all", () => {
    render(<TaskList tasks={[]} totalCount={0} />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("offers Clear filters when nothing matches", () => {
    render(<TaskList tasks={[]} totalCount={3} />);
    expect(screen.getByText(/No tasks match these filters/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/tasks");
  });

  it("renders a link per task with dir=auto titles", () => {
    render(<TaskList tasks={[makeTask({ id: "9", title: "اردو" })]} totalCount={1} />);
    expect(screen.getByRole("link", { name: /اردو/ })).toHaveAttribute("href", "/tasks/9");
  });
});
