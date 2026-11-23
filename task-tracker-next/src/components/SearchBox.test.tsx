import { act, fireEvent, render, screen } from "@testing-library/react";
import { SearchBox } from "./SearchBox";

const replace = vi.fn();
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(query),
}));

beforeEach(() => {
  replace.mockClear();
  query = "";
  vi.useFakeTimers();
});

describe("SearchBox", () => {
  it("updates the URL after the debounce, encoding c++ safely", () => {
    render(<SearchBox />);
    fireEvent.change(screen.getByLabelText("Search by title"), { target: { value: "c++" } });
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/?q=c%2B%2B", { scroll: false });
  });

  it("keeps the other filters and drops q when cleared", () => {
    query = "status=done&q=abc";
    render(<SearchBox />);
    const input = screen.getByLabelText("Search by title");
    expect(input).toHaveValue("abc");
    fireEvent.change(input, { target: { value: "" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledWith("/?status=done", { scroll: false });
  });
});
