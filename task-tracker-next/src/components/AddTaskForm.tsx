"use client";
// Client: a controlled form (typing state, validation on submit, focus) needs the browser.
import { useId, useRef, useState, type FormEvent } from "react";
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

/** Validates like the old tracker, but does not save yet. */
export function AddTaskForm() {
  const uid = useId();
  const today = useLocalToday() ?? "0000-00-00";
  const [values, setValues] = useState<TaskFormValues>(EMPTY_FORM_VALUES);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [message, setMessage] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const validation = validateTask(values, { tasks: [], today });
  const errors = { ...validation.errors };
  // "Title is required" only appears after the first submit attempt.
  if (!triedSubmit) delete errors.title;

  function setField<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setMessage("");
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTriedSubmit(true);
    if (!validation.isValid) {
      if (validation.errors.title !== undefined) titleRef.current?.focus();
      else if (validation.errors.description !== undefined) descriptionRef.current?.focus();
      else dueDateRef.current?.focus();
      setMessage("");
      return;
    }
    setMessage("Saving comes on Day 23");
  }

  const titleCount = countChars(values.title.trim());
  const descriptionCount = countChars(values.description.trim());

  return (
    <form className="task-form" noValidate onSubmit={handleSubmit}>
      <label htmlFor={`${uid}-title`}>Title</label>
      <input
        ref={titleRef}
        id={`${uid}-title`}
        type="text"
        dir="auto"
        value={values.title}
        aria-required="true"
        aria-invalid={errors.title !== undefined}
        aria-describedby={errors.title === undefined ? undefined : `${uid}-title-error`}
        onChange={(event) => setField("title", event.target.value)}
      />
      <p className={titleCount > TITLE_MAX ? "counter over" : "counter"}>
        {titleCount} / {TITLE_MAX}
      </p>
      {errors.title !== undefined && (
        <p id={`${uid}-title-error`} className="field-error">
          {errors.title}
        </p>
      )}

      <label htmlFor={`${uid}-description`}>Description (optional)</label>
      <textarea
        ref={descriptionRef}
        id={`${uid}-description`}
        dir="auto"
        rows={3}
        value={values.description}
        aria-invalid={errors.description !== undefined}
        aria-describedby={errors.description === undefined ? undefined : `${uid}-description-error`}
        onChange={(event) => setField("description", event.target.value)}
      />
      <p className={descriptionCount > DESCRIPTION_MAX ? "counter over" : "counter"}>
        {descriptionCount} / {DESCRIPTION_MAX}
      </p>
      {errors.description !== undefined && (
        <p id={`${uid}-description-error`} className="field-error">
          {errors.description}
        </p>
      )}

      <label htmlFor={`${uid}-priority`}>Priority</label>
      <select
        id={`${uid}-priority`}
        value={values.priority}
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

      <label htmlFor={`${uid}-due`}>Due date (optional)</label>
      <input
        ref={dueDateRef}
        id={`${uid}-due`}
        type="date"
        value={values.dueDate}
        aria-invalid={errors.dueDate !== undefined}
        aria-describedby={errors.dueDate === undefined ? undefined : `${uid}-due-error`}
        onChange={(event) => setField("dueDate", event.target.value)}
      />
      {errors.dueDate !== undefined && (
        <p id={`${uid}-due-error`} className="field-error">
          {errors.dueDate}
        </p>
      )}
      {validation.warnings.dueDate !== undefined && <p className="field-warning">{validation.warnings.dueDate}</p>}

      <div className="form-buttons">
        <button type="submit" className="button-primary">
          Add task
        </button>
      </div>
      <p role="status" className="note">
        {message}
      </p>
    </form>
  );
}
