import { act, render, screen } from "@testing-library/react";
import { DueBadge } from "./DueBadge";

function setToday(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${iso}T12:00:00`));
}

describe("DueBadge", () => {
  it("says Overdue for a past date", () => {
    setToday("2026-11-10");
    render(<DueBadge dueDate="2026-11-05" done={false} />);
    expect(screen.getByText("Overdue (was due 5 Nov 2026)")).toBeInTheDocument();
  });

  it("says Due today for today", () => {
    setToday("2026-11-10");
    render(<DueBadge dueDate="2026-11-10" done={false} />);
    expect(screen.getByText("Due today")).toBeInTheDocument();
  });

  it("never marks a done task as overdue", () => {
    setToday("2026-11-10");
    render(<DueBadge dueDate="2026-11-05" done />);
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    expect(screen.getByText("Due 5 Nov 2026")).toBeInTheDocument();
  });

  it("renders no due date as plain text", () => {
    setToday("2026-11-10");
    render(<DueBadge dueDate={null} done={false} />);
    expect(screen.getByText("No due date")).toBeInTheDocument();
  });

  it("renders the plain date on the server (no local-date badge before mount)", async () => {
    const { renderToString } = await import("react-dom/server");
    setToday("2026-11-10");
    const html = renderToString(<DueBadge dueDate="2026-11-05" done={false} />);
    expect(html).toContain("5 Nov 2026");
    expect(html).not.toContain("Overdue");
    await act(async () => undefined);
  });
});
