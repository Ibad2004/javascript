/**
 * The ids of the elements the app moves focus to after navigation, add, edit and delete.
 * TaskItem and the pages use the same functions, so they can never disagree.
 */
export const focusIds = {
  link: (taskId: string) => `task-${taskId}-link`,
  edit: (taskId: string) => `task-${taskId}-edit`,
  done: (taskId: string) => `task-${taskId}-done`,
  remove: (taskId: string) => `task-${taskId}-delete`,
  /** Every page has exactly one <h1> with this id. */
  pageHeading: 'page-heading',
  unsavedBar: 'unsaved-bar',
  detailEdit: 'detail-edit',
};
