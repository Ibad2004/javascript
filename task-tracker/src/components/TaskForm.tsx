import { useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent, Ref } from 'react';
import type { Priority, Task, TaskFormValues, TaskInput } from '../types';
import {
  DESCRIPTION_MAX,
  EMPTY_FORM_VALUES,
  MESSAGES,
  TITLE_MAX,
  countChars,
  toTaskInput,
  validateTask,
} from '../utils/tasks';

type TaskFormProps = {
  /** The values the inputs start with. The add form starts empty, the edit form with the task. */
  initialValues?: TaskFormValues;
  /** "Add task" or "Save". */
  submitLabel: string;
  /** Called only with valid, trimmed values. */
  onSubmit: (input: TaskInput) => void;
  /** When given, a Cancel button is shown and Escape cancels too. */
  onCancel?: () => void;
  /** Tells the parent whether the values differ from initialValues (for the unsaved-changes bar). */
  onDirtyChange?: (dirty: boolean) => void;
  /** All tasks, for the duplicate-title warning. */
  tasks: readonly Task[];
  /** The task being edited, so it is not a duplicate of itself. */
  editingId?: string | null;
  /** The user's local date, "YYYY-MM-DD", for the past-date warning. */
  today: string;
  /** Add form: empty the inputs after a successful submit and put focus back on the title. */
  clearOnSubmit?: boolean;
  /** Edit form: put focus in the title when the form opens. */
  autoFocusTitle?: boolean;
  /** Lets the parent submit the form from outside (the "Save" in the unsaved-changes bar). */
  ref?: Ref<HTMLFormElement>;
};

type Field = 'title' | 'description' | 'dueDate';

/** One form for both adding and editing. Every input is controlled by state. */
export function TaskForm({
  initialValues = EMPTY_FORM_VALUES,
  submitLabel,
  onSubmit,
  onCancel,
  onDirtyChange,
  tasks,
  editingId = null,
  today,
  clearOnSubmit = false,
  autoFocusTitle = false,
  ref,
}: TaskFormProps) {
  const [values, setValues] = useState(initialValues);
  // "Title is required" is shown only after the user tries to submit, not on an empty new form.
  const [triedSubmit, setTriedSubmit] = useState(false);
  // A half-typed date (e.g. "12/mm/2026") gives value "", but the browser sets validity.badInput.
  const [dateIsBad, setDateIsBad] = useState(false);
  // True right after a successful add, until the user types again (see handleSubmit).
  const justAddedRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const validation = validateTask(values, { tasks, today, editingId });
  const errors = { ...validation.errors };
  if (!triedSubmit && errors.title === MESSAGES.titleRequired) delete errors.title;
  if (dateIsBad) errors.dueDate = MESSAGES.invalidDate;
  const { warnings } = validation;

  const titleCount = countChars(values.title.trim());
  const descriptionCount = countChars(values.description.trim());

  function setField<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    justAddedRef.current = false;
    const next = { ...values, [field]: value };
    setValues(next);
    onDirtyChange?.(!sameValues(next, initialValues));
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    setDateIsBad(event.currentTarget.validity.badInput);
    setField('dueDate', event.currentTarget.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page.
    event.preventDefault();

    // A double click on "Add task" submits twice. The first submit already cleared the
    // form, so the second one would only show "Title is required". Ignore it instead.
    if (clearOnSubmit && justAddedRef.current && sameValues(values, EMPTY_FORM_VALUES)) return;

    const badDate = dueDateRef.current?.validity.badInput ?? false;
    setDateIsBad(badDate);
    const result = validateTask(values, { tasks, today, editingId });

    if (!result.isValid || badDate) {
      setTriedSubmit(true);
      // Focus the first field with an error, so keyboard and screen reader users land on it.
      if (result.errors.title !== undefined) titleRef.current?.focus();
      else if (result.errors.description !== undefined) descriptionRef.current?.focus();
      else dueDateRef.current?.focus();
      return;
    }

    onSubmit(toTaskInput(values));

    if (clearOnSubmit) {
      setValues(EMPTY_FORM_VALUES);
      setTriedSubmit(false);
      setDateIsBad(false);
      justAddedRef.current = true;
      onDirtyChange?.(false);
      titleRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape' && onCancel !== undefined) {
      event.preventDefault();
      onCancel();
    }
  }

  /** The ids for aria-describedby: only the messages that are on screen right now. */
  function describedBy(field: Field, ...extra: string[]): string {
    const ids = [...extra];
    if (errors[field] !== undefined) ids.push(`${uid}-${field}-error`);
    if (field !== 'description' && warnings[field] !== undefined) {
      ids.push(`${uid}-${field}-warning`);
    }
    return ids.join(' ');
  }

  function message(field: Field) {
    const error = errors[field];
    const warning = field === 'description' ? undefined : warnings[field];
    return (
      <>
        {error !== undefined && (
          <p id={`${uid}-${field}-error`} className="field-error">
            {error}
          </p>
        )}
        {warning !== undefined && (
          <p id={`${uid}-${field}-warning`} className="field-warning">
            {warning}
          </p>
        )}
      </>
    );
  }

  return (
    <form
      ref={ref}
      className="task-form"
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <label htmlFor={`${uid}-title`}>Title</label>
      {/* No maxLength: it would silently cut pasted text. We show a counter and an error instead. */}
      <input
        ref={titleRef}
        id={`${uid}-title`}
        name="title"
        type="text"
        dir="auto"
        autoComplete="off"
        aria-required="true"
        // Only the edit form uses this, right after the user clicked "Edit".
        autoFocus={autoFocusTitle}
        value={values.title}
        onChange={(event) => setField('title', event.target.value)}
        aria-invalid={errors.title !== undefined}
        aria-describedby={describedBy('title', `${uid}-title-count`)}
      />
      <span
        id={`${uid}-title-count`}
        className={titleCount > TITLE_MAX ? 'counter over' : 'counter'}
      >
        {titleCount}/{TITLE_MAX}
      </span>
      {message('title')}

      <label htmlFor={`${uid}-description`}>Description</label>
      <textarea
        ref={descriptionRef}
        id={`${uid}-description`}
        name="description"
        rows={3}
        dir="auto"
        value={values.description}
        onChange={(event) => setField('description', event.target.value)}
        aria-invalid={errors.description !== undefined}
        aria-describedby={describedBy('description', `${uid}-description-count`)}
      />
      <span
        id={`${uid}-description-count`}
        className={descriptionCount > DESCRIPTION_MAX ? 'counter over' : 'counter'}
      >
        {descriptionCount}/{DESCRIPTION_MAX}
      </span>
      {message('description')}

      <label htmlFor={`${uid}-priority`}>Priority</label>
      <select
        id={`${uid}-priority`}
        name="priority"
        value={values.priority}
        onChange={(event) => setField('priority', toPriority(event.target.value))}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <label htmlFor={`${uid}-due-date`}>Due date</label>
      <input
        ref={dueDateRef}
        id={`${uid}-due-date`}
        name="dueDate"
        type="date"
        value={values.dueDate}
        onChange={handleDateChange}
        onBlur={(event) => setDateIsBad(event.currentTarget.validity.badInput)}
        aria-invalid={errors.dueDate !== undefined}
        aria-describedby={describedBy('dueDate') || undefined}
      />
      {message('dueDate')}

      <div className="form-buttons">
        <button type="submit">{submitLabel}</button>
        {onCancel !== undefined && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function sameValues(a: TaskFormValues, b: TaskFormValues): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.priority === b.priority &&
    a.dueDate === b.dueDate
  );
}

/** The <select> gives a plain string; turn it back into a Priority without an "as" cast. */
function toPriority(value: string): Priority {
  return value === 'low' || value === 'high' ? value : 'medium';
}
