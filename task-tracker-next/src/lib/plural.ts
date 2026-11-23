/** pluralize(1, 'task') → "1 task", pluralize(2, 'task') → "2 tasks". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
