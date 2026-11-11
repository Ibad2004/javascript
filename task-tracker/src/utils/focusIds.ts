/**
 * The ids of the elements App moves focus to after add, edit and delete.
 * TaskItem uses the same functions, so the two can never disagree.
 */
export const focusIds = {
  select: (taskId: string) => `task-${taskId}-select`,
  edit: (taskId: string) => `task-${taskId}-edit`,
  remove: (taskId: string) => `task-${taskId}-delete`,
  listHeading: 'tasks-heading',
  unsavedBar: 'unsaved-bar',
};
