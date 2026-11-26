"use client";
// Client: switches between the task's details and the edit form.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { updateTask } from "@/app/actions/tasks";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { TaskForm } from "@/components/TaskForm";
import { TaskToggle } from "@/components/TaskToggle";
import { toFormValues } from "@/lib/tasks";
import type { Task } from "@/types";

/** `children` is the details list, still rendered on the server. */
export function TaskEditor({ task, children }: { task: Task; children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const editRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // After Save or Cancel the focus goes back to the Edit button.
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      editRef.current?.focus();
    }
  }, [editing]);

  function close(text: string) {
    returnFocus.current = true;
    setMessage(text);
    setEditing(false);
  }

  return (
    <>
      {editing ? (
        <>
          <h2 className="edit-heading">Edit task</h2>
          <TaskForm
            mode="edit"
            submitLabel="Save"
            initialValues={toFormValues(task)}
            onSave={(values) => updateTask(task.id, values)}
            onSaved={() => close("Changes saved.")}
            onCancel={() => close("")}
          />
        </>
      ) : (
        <>
          {children}
          <div className="detail-actions">
            <TaskToggle id={task.id} title={task.title} done={task.done} variant="detail" />
            <button
              ref={editRef}
              type="button"
              onClick={() => {
                setMessage("");
                setEditing(true);
              }}
            >
              Edit
            </button>
            <DeleteTaskButton id={task.id} title={task.title} redirectToList />
          </div>
        </>
      )}
      <p role="status" aria-live="polite" className="note">
        {message}
      </p>
    </>
  );
}
