import { fireEvent, render, screen } from "@testing-library/react";
import { AddTaskForm } from "./AddTaskForm";

describe("AddTaskForm", () => {
  it("shows an error and focuses the title when it is empty", () => {
    render(<AddTaskForm />);
    expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(screen.queryByText("Saving comes on Day 23")).not.toBeInTheDocument();
  });

  it("rejects a title over 100 characters", () => {
    render(<AddTaskForm />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x".repeat(101) } });
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByText(/100 characters or less/)).toBeInTheDocument();
  });

  it("accepts a valid task and says saving comes later", () => {
    render(<AddTaskForm />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Read" } });
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saving comes on Day 23");
  });
});
