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
