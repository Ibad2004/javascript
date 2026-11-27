import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "./AuthForm";
import type { AuthState } from "@/lib/authResult";

describe("AuthForm", () => {
  it("keeps the email, focuses the wrong field and shows its error after a failed attempt", async () => {
    const action = vi.fn(async (_previous: AuthState, formData: FormData): Promise<AuthState> => ({
      email: String(formData.get("email")),
      fieldErrors: { email: "An account with this email already exists" },
    }));
    render(<AuthForm action={action} mode="signup" next="/about" />);
    await userEvent.type(screen.getByLabelText("Email"), "a@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "long enough");
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    expect(screen.getByLabelText("Email")).toHaveValue("a@example.com");
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(action.mock.calls[0]?.[1].get("next")).toBe("/about");
  });
});
