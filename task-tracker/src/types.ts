export type Priority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  priority: Priority;
  /** Date-only string in the form "YYYY-MM-DD", or null when there is no due date. */
  dueDate: string | null;
};

/** The fields a user can type in. Everything else (id, done) is set by the app. */
export type TaskInput = Pick<Task, 'title' | 'description' | 'priority' | 'dueDate'>;

/**
 * What the form inputs hold while the user types. Every value is a string,
 * because controlled inputs always give strings ("" = no due date).
 */
export type TaskFormValues = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
};
