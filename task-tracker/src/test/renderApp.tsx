import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { startFakeServer } from './fakeServer';
import { LocationProbe } from './LocationProbe';
import { FAKE_TODAY } from './makeTask';

type Options = {
  /** Pass vi.advanceTimersByTime when the test uses fake timers. */
  advanceTimers?: (ms: number) => unknown;
  /** The URL the app starts on (default "/"). */
  route?: string;
};

/** The app inside a MemoryRouter: tests choose the URL, no real browser history. */
export function inRouter(ui: ReactElement, route = '/') {
  return (
    <MemoryRouter initialEntries={[route]} useTransitions={false}>
      {ui}
      <LocationProbe />
    </MemoryRouter>
  );
}

/** The router's current path + query, e.g. "/?status=done". */
export function currentUrl(): string {
  return screen.getByTestId('location').textContent ?? '';
}

/** Like the browser's Back button. */
export function historyBack() {
  fireEvent.click(screen.getByTestId('history-back'));
}

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
  const result = render(inRouter(<App today={FAKE_TODAY} makeId={makeId} />, options.route));
  await waitForLoad();
  return { user, server, ...result };
}

/** Waits until "Loading tasks…" / "Loading task…" is gone (the page or the error is shown). */
export async function waitForLoad() {
  await waitFor(() => expect(screen.queryByText(/^Loading tasks?…$/)).not.toBeInTheDocument());
  // The tab title is set in an effect, which can run a moment AFTER the DOM update above.
  // Under a busy full test run that gap made a title check fail now and then.
  await waitFor(() => expect(document.title).not.toMatch(/^Loading/));
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

/** The page's <h1>. */
export function pageHeading() {
  return screen.getByRole('heading', { level: 1 });
}

/** The link to a task's page in the list (its name starts with the title). */
export function taskLink(title: string) {
  return screen.getByRole('link', { name: new RegExp(`^${escapeRegExp(title)}`) });
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

/** The open delete dialog. */
export function deleteDialog() {
  return screen.getByRole('dialog');
}

/**
 * Since Day 15 Delete asks first: clicks the button named `name` (e.g. "Delete Task B"),
 * then "Delete" in the dialog.
 */
export async function deleteAndConfirm(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name }));
  await user.click(within(deleteDialog()).getByRole('button', { name: 'Delete' }));
}
