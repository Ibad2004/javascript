import type { FormEvent } from 'react';

export function TaskForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page. Saving comes in the next update.
    event.preventDefault();
  }

  return (
    <section className="panel" aria-labelledby="form-heading">
      <h2 id="form-heading">Add a task</h2>
      <form className="task-form" onSubmit={handleSubmit}>
        <label htmlFor="task-title">Title</label>
        <input id="task-title" name="title" type="text" dir="auto" autoComplete="off" />

        <label htmlFor="task-description">Description</label>
        <textarea id="task-description" name="description" rows={3} dir="auto" />

        <label htmlFor="task-priority">Priority</label>
        <select id="task-priority" name="priority" defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <label htmlFor="task-due-date">Due date</label>
        <input id="task-due-date" name="dueDate" type="date" />

        <button type="submit" disabled aria-describedby="form-note">
          Add task
        </button>
        <p id="form-note" className="note">
          Adding tasks comes in the next update.
        </p>
      </form>
    </section>
  );
}
