import type { Task } from '../types';
import { sortTasks } from './tasks';

export const STATUS_FILTERS = ['all', 'pending', 'done'] as const;
export const PRIORITY_FILTERS = ['any', 'high', 'medium', 'low'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

/** Longest search kept from the URL or the input (in characters, not UTF-16 units). */
export const SEARCH_MAX = 100;

export type Filters = {
  status: StatusFilter;
  priority: PriorityFilter;
  /** The search text as typed (cut to SEARCH_MAX). Matching uses normalizeSearch(q). */
  q: string;
};

export const DEFAULT_FILTERS: Filters = { status: 'all', priority: 'any', q: '' };

export const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  pending: 'Pending',
  done: 'Done',
};

export const PRIORITY_FILTER_LABELS: Record<PriorityFilter, string> = {
  any: 'Any',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function oneOf<T extends string>(allowed: readonly T[], raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  const value = raw.trim().toLowerCase();
  return allowed.find((item) => item === value) ?? fallback;
}

/** Cuts to `max` characters without splitting an emoji or a combined letter's code point. */
export function cutSearch(text: string, max = SEARCH_MAX): string {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('') : text;
}

/**
 * The URL is untrusted (typed, shared, edited by hand): DONE → done, unknown values → the
 * default, a repeated param → the first one (URLSearchParams.get), q cut to 100 characters.
 */
export function readFilters(params: URLSearchParams): Filters {
  return {
    status: oneOf(STATUS_FILTERS, params.get('status'), 'all'),
    priority: oneOf(PRIORITY_FILTERS, params.get('priority'), 'any'),
    q: cutSearch(params.get('q') ?? ''),
  };
}

/** Only the non-default filters, so the plain list stays a clean "/". */
export function writeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.priority !== 'any') params.set('priority', filters.priority);
  // A search of only spaces matches everything, so it is left out too.
  if (filters.q.trim() !== '') params.set('q', cutSearch(filters.q));
  return params;
}

/** "?status=done" or "" — for links back to the list with the same filters. */
export function filtersToSearch(filters: Filters): string {
  const text = writeFilters(filters).toString();
  return text === '' ? '' : `?${text}`;
}

export function hasActiveFilters(filters: Filters): boolean {
  return filtersToSearch(filters) !== '';
}

/**
 * Trimmed, runs of spaces collapsed, case-insensitive. NFKC also matches the different
 * Unicode forms of the same Urdu/Arabic letter. Plain text: no RegExp is built from it.
 */
export function normalizeSearch(text: string): string {
  return text.normalize('NFKC').trim().split(/\s+/).join(' ').toLowerCase();
}

function matchesStatus(task: Task, status: StatusFilter): boolean {
  if (status === 'all') return true;
  return status === 'done' ? task.done : !task.done;
}

function matchesPriority(task: Task, priority: PriorityFilter): boolean {
  return priority === 'any' || task.priority === priority;
}

export function matchesFilters(task: Task, filters: Filters): boolean {
  const needle = normalizeSearch(filters.q);
  return (
    matchesStatus(task, filters.status) &&
    matchesPriority(task, filters.priority) &&
    (needle === '' || normalizeSearch(task.title).includes(needle))
  );
}

/** The list the user sees: filtered, always sorted. Calculated during render, never stored. */
export function filterTasks(tasks: readonly Task[], filters: Filters): Task[] {
  return sortTasks(tasks.filter((task) => matchesFilters(task, filters)));
}

/** The counts on the status buttons: "All (8)", "Pending (5)", "Done (3)". Over ALL tasks. */
export function countByStatus(tasks: readonly Task[]): Record<StatusFilter, number> {
  const done = tasks.filter((task) => task.done).length;
  return { all: tasks.length, pending: tasks.length - done, done };
}
