"use client";
// Client: the show/hide toggle changes the input type with state, which only works in the browser.
import { useId, useState } from "react";

type PasswordFieldProps = { autoComplete: "current-password" | "new-password"; hint?: string; error?: string };

export function PasswordField({ autoComplete, hint, error }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [hint === undefined ? "" : `${id}-hint`, error === undefined ? "" : `${id}-error`]
    .filter((part) => part !== "")
    .join(" ");
  return (
    <>
      <label htmlFor={id}>Password</label>
      <div className="password-row">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-required="true"
          aria-invalid={error !== undefined}
          aria-describedby={describedBy === "" ? undefined : describedBy}
        />
        <button type="button" aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          {visible ? "Hide password" : "Show password"}
        </button>
      </div>
      {hint !== undefined && (
        <p id={`${id}-hint`} className="note">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${id}-error`} role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
