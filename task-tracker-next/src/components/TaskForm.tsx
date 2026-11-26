"use client";
// Client: a controlled form (typing state, validation, pending state, focus) that calls a server action.
import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { callAction } from "@/components/callAction";
import type { ActionResult, FieldErrors } from "@/lib/actionResult";
import { useLocalToday } from "@/lib/useLocalToday";
import {
  DESCRIPTION_MAX,
  EMPTY_FORM_VALUES,
  PRIORITY_LABELS,
  TITLE_MAX,
  countChars,
  validateTask,
} from "@/lib/tasks";
import type { Priority, TaskFormValues } from "@/types";

function isPriority(value: string): value is Priority {
  return value === "low" || value === "medium" || value === "high";
}

type TaskFormProps = {
  onSave: (values: TaskFormValues) => Promise<ActionResult>;
  submitLabel: string;
} & (
  | { mode: "add" }
  | { mode: "edit"; initialValues: TaskFormValues; onSaved: () => void; onCancel: () => void }
);

type Message = { text: string; isError: boolean };
const NO_MESSAGE: Message = { text: "", isError: false };

/**
 * The add form and the edit form. The inputs are controlled and the form is submitted with
 * onSubmit (not <form action>, which resets the form), so a failed save keeps the text.
 */
export function TaskForm(props: TaskFormProps) {
  const uid = useId();
  const today = useLocalToday() ?? "0000-00-00";
  const [values, setValues] = useState<TaskFormValues>(
    props.mode === "edit" ? props.initialValues : EMPTY_FORM_VALUES,
  );
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<Message>(NO_MESSAGE);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  // Set at once on submit; `pending` only changes with the next render.
  const inFlight = useRef(false);

  // Opening the edit form moves the focus into it.
  const isEdit = props.mode === "edit";
  useEffect(() => {
    if (isEdit) titleRef.current?.focus();
  }, [isEdit]);

  function focusFirstError(found: FieldErrors) {
    if (found.title !== undefined) titleRef.current?.focus();
    else if (found.description !== undefined) descriptionRef.current?.focus();
    else if (found.priority !== undefined) priorityRef.current?.focus();
    else if (found.dueDate !== undefined) dueDateRef.current?.focus();
  }

  async function saveAction(_previous: null, submitted: TaskFormValues): Promise<null> {
    const result = await callAction(() => props.onSave(submitted));
    inFlight.current = false;
    if (!result.ok) {
      setServerErrors(result.fieldErrors ?? {});
      setMessage({ text: result.message, isError: true });
      focusFirstError(result.fieldErrors ?? {});
    } else if (props.mode === "edit") {
      // In a transition, so the form closes together with the new task data.
      startTransition(props.onSaved);
    } else {
      setValues(EMPTY_FORM_VALUES);
      setTriedSubmit(false);
      setMessage({ text: "Task added.", isError: false });
      titleRef.current?.focus();
    }
    return null;
  }

  const [, save, pending] = useActionState(saveAction, null);

  const validation = validateTask(values, { tasks: [], today });
  const errors: FieldErrors = { ...serverErrors, ...validation.errors };
  // "Title is required" only appears after the first submit attempt.
  if (!triedSubmit) delete errors.title;

  function setField<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setMessage(NO_MESSAGE);
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setTriedSubmit(true);
    setServerErrors({});
    setMessage(NO_MESSAGE);
    if (!validation.isValid) {
      focusFirstError(validation.errors);
      return;
    }
    inFlight.current = true;
    startTransition(() => save(values));
  }

  const titleCount = countChars(values.title.trim());
  const descriptionCount = countChars(values.description.trim());
  const describedBy = (field: keyof FieldErrors) =>
    errors[field] === undefined ? undefined : `${uid}-${field}-error`;
  const fieldError = (field: keyof FieldErrors) =>
    errors[field] !== undefined && (
      <p id={`${uid}-${field}-error`} className="field-error">
        {errors[field]}
      </p>
    );

  return (
    <form className="task-form" noValidate onSubmit={handleSubmit} aria-busy={pending}>
      <label htmlFor={`${uid}-title`}>Title</label>
      <input
        ref={titleRef}
        id={`${uid}-title`}
        type="text"
        dir="auto"
        value={values.title}
        readOnly={pending}
        aria-required="true"
        aria-invalid={errors.title !== undefined}
        aria-describedby={describedBy("title")}
        onChange={(event) => setField("title", event.target.value)}
      />
      <p className={titleCount > TITLE_MAX ? "counter over" : "counter"}>
        {titleCount} / {TITLE_MAX}
      </p>
      {fieldError("title")}

      <label htmlFor={`${uid}-description`}>Description (optional)</label>
      <textarea
        ref={descriptionRef}
        id={`${uid}-description`}
        dir="auto"
        rows={3}
        value={values.description}
        readOnly={pending}
        aria-invalid={errors.description !== undefined}
        aria-describedby={describedBy("description")}
        onChange={(event) => setField("description", event.target.value)}
      />
      <p className={descriptionCount > DESCRIPTION_MAX ? "counter over" : "counter"}>
        {descriptionCount} / {DESCRIPTION_MAX}
      </p>
      {fieldError("description")}

      <label htmlFor={`${uid}-priority`}>Priority</label>
      <select
        ref={priorityRef}
        id={`${uid}-priority`}
        value={values.priority}
        disabled={pending}
        aria-invalid={errors.priority !== undefined}
        aria-describedby={describedBy("priority")}
        onChange={(event) => {
          if (isPriority(event.target.value)) setField("priority", event.target.value);
        }}
      >
        {(["low", "medium", "high"] as const).map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
      {fieldError("priority")}

      <label htmlFor={`${uid}-dueDate`}>Due date (optional)</label>
      <input
        ref={dueDateRef}
        id={`${uid}-dueDate`}
        type="date"
        value={values.dueDate}
        readOnly={pending}
        aria-invalid={errors.dueDate !== undefined}
        aria-describedby={describedBy("dueDate")}
        onChange={(event) => setField("dueDate", event.target.value)}
      />
      {fieldError("dueDate")}
      {validation.warnings.dueDate !== undefined && <p className="field-warning">{validation.warnings.dueDate}</p>}

      <div className="form-buttons">
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? "Saving…" : props.submitLabel}
        </button>
        {props.mode === "edit" && (
          <button type="button" disabled={pending} onClick={props.onCancel}>
            Cancel
          </button>
        )}
      </div>
      {message.isError && (
        <p role="alert" className="form-error">
          {message.text}
        </p>
      )}
      <p role="status" aria-live="polite" className="note">
        {message.isError ? "" : message.text}
      </p>
    </form>
  );
}
