import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';

type ConfirmDeleteDialogProps = {
  /** The task's title, shown in the question. */
  title: string;
  onConfirm: () => void;
  /** Escape, Cancel and a click on the backdrop all end here. The parent puts focus back. */
  onCancel: () => void;
};

/**
 * "Delete "<title>"? This can be undone for 5 seconds." [Cancel] [Delete]
 *
 * A native <dialog> opened with showModal(): the browser traps focus inside it, makes the
 * page behind it inert and gives it the dark ::backdrop. The parent renders it only while
 * a delete is being asked about, so it is always opened fresh, with focus on Cancel.
 * The Undo bar still appears after "Delete": the dialog stops accidents, Undo is for a
 * change of mind.
 */
export function ConfirmDeleteDialog({ title, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The first answer wins: a double click on Delete deletes once, and Escape after a click
  // does nothing more.
  const answeredRef = useRef(false);
  const uid = useId();

  // Opening a modal dialog is a DOM API, not React state: an effect keeps the two in sync.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (!dialog.open) dialog.showModal();
    // The safe choice gets focus first.
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function answer(action: () => void) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    action();
  }

  /** The browser's own Escape handling ("cancel" event): we close it through React instead. */
  function handleCancelEvent(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    answer(onCancel);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    answer(onCancel);
  }

  /** The backdrop belongs to the <dialog> itself; the content sits in an inner box. */
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) answer(onCancel);
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-text`}
      onCancel={handleCancelEvent}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <div className="dialog-body">
        <h2 id={`${uid}-title`} className="dialog-title">
          Delete “<bdi>{title}</bdi>”?
        </h2>
        <p id={`${uid}-text`}>This can be undone for 5 seconds.</p>
        <div className="dialog-buttons">
          <button
            ref={cancelRef}
            type="button"
            className="button-secondary"
            onClick={() => answer(onCancel)}
          >
            Cancel
          </button>
          <button type="button" className="button-danger" onClick={() => answer(onConfirm)}>
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}
