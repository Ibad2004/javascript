import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { startFakeServer } from './test/fakeServer';
import { FAKE_TODAY, makeTask } from './test/makeTask';
import {
  inRouter,
  listedTitles,
  pageHeading,
  renderApp,
  taskLink,
  deleteAndConfirm,
} from './test/renderApp';
import type { Task } from './types';

const LONG_TITLE = 'Prepare the quarterly report for the finance team and send it';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Write report', description: 'For Monday', dueDate: '2026-11-12' }),
  makeTask({ id: 'b', title: LONG_TITLE, dueDate: '2026-11-20' }),
  makeTask({ id: 'with space', title: 'Odd id', dueDate: '2026-11-25' }),
];

function backLink() {
  return screen.getByRole('link', { name: /Back to tasks/ });
}

function notice() {
  return document.querySelector('.notice');
}

describe('routes', () => {
  it('"/" is the list page: summary, list and add form; title "Tasks"', async () => {
    await renderApp(tasks);
    expect(pageHeading()).toHaveTextContent('Tasks');
    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
    expect(listedTitles()).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Add a task' })).toBeInTheDocument();
    expect(document.title).toBe('Tasks');
  });

  it('the first load does not move focus (the browser starts at the top)', async () => {
    await renderApp(tasks);
    expect(pageHeading()).not.toHaveFocus();
  });

  it('"/tasks/:id" is the detail page: the title is the <h1> and in the tab title', async () => {
    await renderApp(tasks, { route: '/tasks/a' });
    expect(pageHeading()).toHaveTextContent('Write report');
    expect(screen.getByText('For Monday')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(document.title).toBe('Write report | Tasks');
  });

  it('a title over 50 characters is cut with "…" in the tab title (the <h1> keeps it whole)', async () => {
    await renderApp(tasks, { route: '/tasks/b' });
    expect(pageHeading()).toHaveTextContent(LONG_TITLE);
    expect(document.title).toBe(`${LONG_TITLE.slice(0, 50).trimEnd()}… | Tasks`);
  });

  it('the list link is a real href (a new tab works) and opens the page with focus on the <h1>', async () => {
    const { user } = await renderApp(tasks);
    expect(taskLink('Write report')).toHaveAttribute('href', '/tasks/a');
    expect(taskLink('Odd id')).toHaveAttribute('href', '/tasks/with%20space');

    await user.click(taskLink('Odd id'));
    expect(pageHeading()).toHaveTextContent('Odd id');
    expect(pageHeading()).toHaveFocus();
    expect(document.title).toBe('Odd id | Tasks');
  });

  it('"Back to tasks" returns to the list, the title and focus follow', async () => {
    const { user } = await renderApp(tasks, { route: '/tasks/a' });
    await user.click(backLink());
    expect(pageHeading()).toHaveTextContent('Tasks');
    expect(pageHeading()).toHaveFocus();
    expect(document.title).toBe('Tasks');
  });

  it('a trailing slash works: /tasks/a/', async () => {
    await renderApp(tasks, { route: '/tasks/a/' });
    expect(pageHeading()).toHaveTextContent('Write report');
  });

  it('an unknown path shows "Page not found" and a link home', async () => {
    const { user } = await renderApp(tasks, { route: '/nothing/here' });
    expect(pageHeading()).toHaveTextContent('Page not found');
    expect(document.title).toBe('Page not found | Tasks');

    await user.click(screen.getByRole('link', { name: 'Go to your tasks' }));
    expect(pageHeading()).toHaveTextContent('Tasks');
    expect(pageHeading()).toHaveFocus();
  });
});

describe('detail page: loading, not found, errors', () => {
  it('while the list is loading it says "Loading task…", NEVER "Task not found"', async () => {
    const server = startFakeServer(tasks);
    const hold = server.holdNext();
    render(inRouter(<App today={FAKE_TODAY} />, '/tasks/a'));

    expect(pageHeading()).toHaveTextContent('Loading task…');
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');

    hold.release();
    await waitFor(() => expect(pageHeading()).toHaveTextContent('Write report'));
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
  });

  it('a load error shows the message and "Try again", which loads the task', async () => {
    const server = startFakeServer(tasks);
    server.failNextWithNetworkError();
    const user = userEvent.setup();
    render(inRouter(<App today={FAKE_TODAY} />, '/tasks/a'));

    expect(
      await screen.findByText("Can't reach the server. Is it running? (npm run api)"),
    ).toBeInTheDocument();
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(pageHeading()).toHaveTextContent('Write report'));
  });

  it.each([
    ['an unknown id', '/tasks/zzz'],
    ['spaces', '/tasks/%20%20'],
    ['a bare %', '/tasks/%'],
    ['a broken escape', '/tasks/%E0%A4%A'],
    ['an encoded slash', '/tasks/a%2Fb'],
    ['a very long id', `/tasks/${'x'.repeat(5000)}`],
  ])('%s → "Task not found" + "Back to tasks", no crash', async (_name, route) => {
    const { user } = await renderApp(tasks, { route });
    expect(pageHeading()).toHaveTextContent('Task not found');
    expect(document.title).toBe('Task not found | Tasks');
    await user.click(backLink());
    expect(pageHeading()).toHaveTextContent('Tasks');
  });

  it('done on the detail page: the checkbox ticks and the server gets { done }', async () => {
    const { user, server } = await renderApp(tasks, { route: '/tasks/a' });
    await user.click(screen.getByRole('checkbox', { name: 'Mark as done' }));
    expect(screen.getByRole('checkbox', { name: 'Mark as done' })).toBeChecked();
    await waitFor(() => expect(server.task('a')).toMatchObject({ done: true }));
  });

  it('a 404 on the detail page (deleted in another tab): the message on the list', async () => {
    const { user, server } = await renderApp(tasks, { route: '/tasks/a' });
    server.deleteFromAnotherTab('a');
    await user.click(screen.getByRole('checkbox', { name: 'Mark as done' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    expect(notice()).toHaveTextContent('This task no longer exists');
    expect(listedTitles()).not.toContain('Write report');
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
  });

  it('a 404 on Delete from the detail page: the list, the message, no Undo', async () => {
    const { user, server } = await renderApp(tasks, { route: '/tasks/a' });
    server.deleteFromAnotherTab('a');
    await deleteAndConfirm(user, 'Delete');

    expect(pageHeading()).toHaveTextContent('Tasks');
    await waitFor(() => expect(notice()).toHaveTextContent('This task no longer exists'));
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});
