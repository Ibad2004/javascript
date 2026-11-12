import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';
import { App } from '../App';
import { startFakeServer } from './fakeServer';
import { FAKE_TODAY } from './makeTask';

type Options = {
  /** Pass vi.advanceTimersByTime when the test uses fake timers. */
  advanceTimers?: (ms: number) => unknown;
};

/**
 * Starts a fake json-server holding `serverData`, renders the App with fake ids
 * ("new-1", "new-2", ...) and the fake today, and waits until the list has loaded.
 * Call vi.restoreAllMocks() in afterEach (done in setup.ts) to remove the fetch spy.
 */
export async function renderApp(serverData: readonly unknown[], options: Options = {}) {
  const server = startFakeServer(serverData);
  const user = userEvent.setup(
    options.advanceTimers ? { advanceTimers: options.advanceTimers } : {},
  );
  let nextId = 0;
  const makeId = () => `new-${++nextId}`;
  const result = render(<App today={FAKE_TODAY} makeId={makeId} />);
  await waitForLoad();
  return { user, server, ...result };
}

/** Waits until "Loading tasks…" is gone (the list or the error is on screen). */
export async function waitForLoad() {
  await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());
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
