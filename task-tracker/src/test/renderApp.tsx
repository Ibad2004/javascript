import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import type { Task } from '../types';
import { FAKE_TODAY } from './makeTask';

type Options = {
  /** Pass vi.advanceTimersByTime when the test uses fake timers. */
  advanceTimers?: (ms: number) => unknown;
};

/** Renders the App with fake ids ("new-1", "new-2", ...) and the fake today. */
export function renderApp(initialTasks: Task[], options: Options = {}) {
  const user = userEvent.setup(
    options.advanceTimers ? { advanceTimers: options.advanceTimers } : {},
  );
  let nextId = 0;
  const makeId = () => `new-${++nextId}`;
  const result = render(<App initialTasks={initialTasks} today={FAKE_TODAY} makeId={makeId} />);
  return { user, ...result };
}

export function taskList() {
  return screen.getByRole('list');
}

/** The titles in the list, top to bottom. */
export function listedTitles(): string[] {
  const list = screen.queryByRole('list');
  if (list === null) return [];
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.task-title')?.textContent ?? '');
}

export function detailPanel() {
  return screen.getByRole('region', { name: 'Task details' });
}

export function addForm() {
  return screen.getByRole('region', { name: 'Add a task' });
}

/** The visually hidden live region (the list status line is another role="status"). */
export function liveRegion(): HTMLElement {
  const region = document.querySelector<HTMLElement>('.visually-hidden[role="status"]');
  if (region === null) throw new Error('The live region is missing');
  return region;
}
