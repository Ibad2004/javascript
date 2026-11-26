"use client";
// Client: opens a modal <dialog> and calls a server action.
import { useId, useRef, useState, useTransition } from "react";
import { deleteTask } from "@/app/actions/tasks";
import { ActionError } from "@/components/ActionError";
import { callAction } from "@/components/callAction";

type DeleteTaskButtonProps = {
  id: string;
  title: string;
  /** On the task page: go back to the list afterwards. */
  redirectToList?: boolean;
  /** On the list: the element that gets the focus when the deleted row is gone. */
  focusAfterId?: string;
};

export function DeleteTaskButton({ id, title, redirectToList = false, focusAfterId }: DeleteTaskButtonProps) {
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const deleted = useRef(false);

  function open() {
    deleted.current = false;
    setError("");
    dialogRef.current?.showModal();
  }

  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    startTransition(async () => {
      const result = await callAction(() => deleteTask(id, redirectToList));
      inFlight.current = false;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      deleted.current = true;
      dialogRef.current?.close();
      if (focusAfterId !== undefined) document.getElementById(focusAfterId)?.focus();
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="delete-button"
        aria-haspopup="dialog"
        aria-label={`Delete: ${title}`}
        onClick={open}
      >
        Delete
      </button>
      {/* showModal() gives the focus trap and Escape. Cancel is first, so it gets the focus. */}
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-text`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        // The close event arrives later, so after a delete it must not pull the focus back.
        onClose={() => {
          if (!deleted.current) triggerRef.current?.focus();
        }}
      >
        <div className="dialog-body">
          <h2 id={`${uid}-title`} className="dialog-title">
            Delete this task?
          </h2>
          <p id={`${uid}-text`}>
            “<bdi>{title}</bdi>” will be deleted. This cannot be undone.
          </p>
          {error !== "" && <ActionError message={error} />}
          <div className="dialog-buttons">
            <button type="button" disabled={pending} onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <button type="button" className="button-danger" disabled={pending} onClick={confirm}>
              {pending ? "Deleting…" : "Delete task"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
