"use client";
// Client: shows the pending state and the action's errors, and moves the focus to a wrong field.
import { useActionState, useEffect, useId, useRef } from "react";
import { PasswordField } from "@/components/PasswordField";
import type { AuthState } from "@/lib/authResult";

type AuthFormProps = {
  action: (previous: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "login" | "signup";
  /** Already checked on the server; the action checks it again. */
  next: string;
};

const NO_STATE: AuthState = {};

/**
 * Uses <form action>, not onSubmit: if someone submits before the page's JavaScript is
 * ready, the form still POSTs. A plain onSubmit form would put the password in the URL.
 */
export function AuthForm({ action, mode, next }: AuthFormProps) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(action, NO_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const emailError = state.fieldErrors?.email;
  const label = mode === "login" ? "Log in" : "Sign up";

  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <form ref={formRef} className="task-form" noValidate action={formAction} aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      <label htmlFor={`${uid}-email`}>Email</label>
      <input
        id={`${uid}-email`}
        name="email"
        type="email"
        autoComplete={mode === "login" ? "username" : "email"}
        // React resets the form after an action; the default value brings the email back.
        defaultValue={state.email}
        readOnly={pending}
        aria-required="true"
        aria-invalid={emailError !== undefined}
        aria-describedby={emailError === undefined ? undefined : `${uid}-email-error`}
      />
      {emailError !== undefined && (
        <p id={`${uid}-email-error`} role="alert" className="field-error">
          {emailError}
        </p>
      )}
      <PasswordField
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "signup" ? "Use 8 to 72 characters." : undefined}
        error={state.fieldErrors?.password}
      />
      <div className="form-buttons">
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? "Please wait…" : label}
        </button>
      </div>
      {state.message !== undefined && (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      )}
    </form>
  );
}
