export const APP_TITLE = 'Tasks';
export const TITLE_MAX = 50;

/** Cuts a long title to 50 characters + "…". Counts characters, not UTF-16 units (emoji stay whole). */
export function shortenTitle(title: string, max = TITLE_MAX): string {
  const chars = Array.from(title.trim());
  return chars.length > max ? `${chars.slice(0, max).join('').trimEnd()}…` : chars.join('');
}

/** "Tasks" for the list; "<page> | Tasks" for every other page. */
export function pageTitle(page?: string): string {
  return page === undefined ? APP_TITLE : `${shortenTitle(page)} | ${APP_TITLE}`;
}

/** The path of a task's detail page. The id is encoded, so odd ids cannot break the URL. */
export function taskPath(id: string): string {
  return `/tasks/${encodeURIComponent(id)}`;
}
