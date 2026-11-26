"use client";
// Client: a checkbox that calls a server action and shows a pending state.
import { useRef, useState, useTransition } from "react";
import { toggleTask } from "@/app/actions/tasks";
import { ActionError } from "@/components/ActionError";
import { callAction } from "@/components/callAction";

type TaskToggleProps = {
  id: string;
  title: string;
  done: boolean;
  /** "item": only the checkbox (list). "detail": with a visible label (task page). */
  variant: "item" | "detail";
};

export function TaskToggle({ id, title, done, variant }: TaskToggleProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  function toggle() {
    // A second click before the answer would flip the task back.
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    startTransition(async () => {
      const result = await callAction(() => toggleTask(id));
      inFlight.current = false;
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <>
      <label className={variant === "item" ? "task-check" : "detail-done"}>
        {/* aria-disabled, not disabled: the keyboard focus stays on the checkbox while saving. */}
        <input
          type="checkbox"
          checked={done}
          aria-disabled={pending}
          aria-busy={pending}
          aria-label={variant === "item" ? `Done: ${title}` : undefined}
          onChange={toggle}
        />
        {variant === "detail" && <span>{pending ? "Saving…" : "Done"}</span>}
      </label>
      {error !== "" && <ActionError message={error} />}
    </>
  );
}
