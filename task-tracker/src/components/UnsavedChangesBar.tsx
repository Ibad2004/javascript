type UnsavedChangesBarProps = {
  id: string;
  onSave: () => void;
  onDiscard: () => void;
};

/**
 * Shown above the edit form when the user tries to leave it with unsaved changes.
 * It replaces window.confirm(): it does not block the page, and it can be styled
 * and reached with the keyboard. App moves focus to it (tabIndex -1).
 */
export function UnsavedChangesBar({ id, onSave, onDiscard }: UnsavedChangesBarProps) {
  return (
    <div id={id} className="unsaved-bar" role="group" aria-labelledby={`${id}-text`} tabIndex={-1}>
      <p id={`${id}-text`}>You have unsaved changes</p>
      <div className="bar-buttons">
        <button type="button" className="button-primary" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}
