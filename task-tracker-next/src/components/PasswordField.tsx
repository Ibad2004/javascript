"use client";
// Client: the show/hide toggle changes the input type with state, which only works in the browser.
import { useId, useState } from "react";

type PasswordFieldProps = { autoComplete: "current-password" | "new-password"; hint?: string };

export function PasswordField({ autoComplete, hint }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label htmlFor={id}>Password</label>
      <div className="password-row">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-describedby={hint === undefined ? undefined : `${id}-hint`}
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
    </>
  );
}
