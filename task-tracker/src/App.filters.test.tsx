import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import {
  addForm,
  currentUrl,
  historyBack,
  listedTitles,
  liveRegion,
  renderApp,
  taskLink,
  deleteAndConfirm,
} from './test/renderApp';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Buy milk', priority: 'high', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Learn C++ (basics)', priority: 'low', dueDate: '2026-11-12' }),
  makeTask({ id: 'c', title: 'دودھ خریدنا', priority: 'medium', dueDate: '2026-11-13' }),
  makeTask({ id: 'd', title: 'Pay rent', priority: 'high', done: true, dueDate: '2026-11-14' }),
];

function statusButton(name: 'All' | 'Pending' | 'Done') {
  return within(screen.getByRole('group', { name: 'Status' })).getByRole('button', {
    name: new RegExp(`^${name} \\(`),
  });
}

function prioritySelect() {
  return screen.getByRole('combobox', { name: 'Filter by priority' });
}

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Search by title' });
}

function hiddenNote() {
  return document.querySelector('.hidden-note');
}

describe('App: filters', () => {
  it('status buttons show counts over all tasks and aria-pressed', async () => {
    const { user } = await renderApp(tasks);
    expect(statusButton('All')).toHaveTextContent('All (4)');
    expect(statusButton('Pending')).toHaveTextContent('Pending (3)');
    expect(statusButton('Done')).toHaveTextContent('Done (1)');
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Showing 4 of 4 tasks')).toBeInTheDocument();

    await user.click(statusButton('Done'));
    expect(statusButton('Done')).toHaveAttribute('aria-pressed', 'true');
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'false');
    expect(listedTitles()).toEqual(['Pay rent']);
    expect(screen.getByText('Showing 1 of 4 tasks')).toBeInTheDocument();
    expect(currentUrl()).toBe('/?status=done');
    // Counts stay over ALL tasks.
    expect(statusButton('Pending')).toHaveTextContent('Pending (3)');
  });

  it('priority filters the list and goes in the URL; status + priority combine', async () => {
    const { user } = await renderApp(tasks);
    await user.selectOptions(prioritySelect(), 'high');
    expect(listedTitles()).toEqual(['Buy milk', 'Pay rent']);
    expect(currentUrl()).toBe('/?priority=high');

    await user.click(statusButton('Pending'));
    expect(listedTitles()).toEqual(['Buy milk']);
    expect(currentUrl()).toBe('/?status=pending&priority=high');

    await user.selectOptions(prioritySelect(), 'any');
    expect(currentUrl()).toBe('/?status=pending');
  });

  it('search: trimmed, extra spaces, any case; plain text so "c++" and "(" work', async () => {
    const { user } = await renderApp(tasks);
    await user.type(searchBox(), '  BUY   milk ');
    expect(listedTitles()).toEqual(['Buy milk']);

    await user.clear(searchBox());
    await user.type(searchBox(), 'c++');
    expect(listedTitles()).toEqual(['Learn C++ (basics)']);
    expect(currentUrl()).toBe('/?q=c%2B%2B');

    await user.clear(searchBox());
    await user.type(searchBox(), '(');
    expect(listedTitles()).toEqual(['Learn C++ (basics)']);
  });

  it('search works in Urdu', async () => {
    await renderApp(tasks, { route: `/?q=${encodeURIComponent('دودھ')}` });
    expect(searchBox()).toHaveValue('دودھ');
    expect(listedTitles()).toEqual(['دودھ خریدنا']);
  });

  it('status pushes history (Back undoes it); typing replaces it (no entry per letter)', async () => {
    const { user } = await renderApp(tasks);
    await user.click(statusButton('Pending'));
    await user.click(statusButton('Done'));
    historyBack();
    expect(await screen.findByText('Showing 3 of 4 tasks')).toBeInTheDocument();
    expect(currentUrl()).toBe('/?status=pending');

    await user.type(searchBox(), 'milk');
    expect(currentUrl()).toBe('/?status=pending&q=milk');
    // One Back skips all four letters: typing replaced the entry each time.
    historyBack();
    expect(await screen.findByText('Showing 4 of 4 tasks')).toBeInTheDocument();
    expect(currentUrl()).toBe('/');
  });

  it('a bad URL never crashes: any case, unknown → default, first of repeats, q cut to 100', async () => {
    const longQ = 'x'.repeat(150);
    await renderApp(tasks, {
      route: `/?status=DONE&status=pending&priority=urgent&q=${longQ}&q=milk`,
    });
    expect(statusButton('Done')).toHaveAttribute('aria-pressed', 'true');
    expect(prioritySelect()).toHaveValue('any');
    expect(searchBox()).toHaveValue('x'.repeat(100));
    expect(screen.getByText(/No tasks match these filters/)).toBeInTheDocument();
  });

  it('no match: the message and "Clear filters", which resets the URL and focuses search', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=done&q=milk' });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 0 of 4 tasks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(currentUrl()).toBe('/');
    expect(listedTitles()).toHaveLength(4);
    expect(searchBox()).toHaveValue('');
    expect(searchBox()).toHaveFocus();
  });

  it('a new task hidden by the filters says so; "Show all" clears them and focuses it', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=done' });
    await user.type(within(addForm()).getByLabelText('Title'), 'New one{Enter}');

    const message = 'Task added, but hidden by your filters.';
    expect(await screen.findByText(message, { selector: '.hidden-note' })).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent(message);
    expect(screen.getByText('Showing 1 of 5 tasks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all' }));
    expect(currentUrl()).toBe('/');
    expect(hiddenNote()).toBeNull();
    expect(taskLink('New one')).toHaveFocus();
  });

  it('a new task that matches the filters gives the normal message', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=pending' });
    await user.type(within(addForm()).getByLabelText('Title'), 'Visible{Enter}');
    expect(await screen.findByText('Showing 4 of 5 tasks')).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('Task added');
    expect(hiddenNote()).toBeNull();
  });

  it('unticking under "Done" says the task is hidden by the filters', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=done' });
    await user.click(screen.getByRole('checkbox', { name: 'Mark Pay rent as done' }));
    expect(hiddenNote()).toHaveTextContent('Task marked not done, but hidden by your filters.');
    expect(screen.getByText(/No tasks match these filters/)).toBeInTheDocument();
  });

  it('Undo of a task the filters now hide says so', async () => {
    const { user } = await renderApp(tasks);
    await deleteAndConfirm(user, 'Delete Buy milk');
    await user.click(statusButton('Done'));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      await screen.findByText('Task restored, but hidden by your filters.', {
        selector: '.hidden-note',
      }),
    ).toBeInTheDocument();
  });

  it('the next action clears an old "hidden" message', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=done' });
    await user.click(screen.getByRole('checkbox', { name: 'Mark Pay rent as done' }));
    expect(hiddenNote()).not.toBeNull();
    await user.click(statusButton('All'));
    await user.click(screen.getByRole('checkbox', { name: 'Mark Buy milk as done' }));
    expect(hiddenNote()).toBeNull();
  });

  it('changing the filters removes an old "hidden" message (it could now be wrong)', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=done' });
    await user.type(within(addForm()).getByLabelText('Title'), 'New one{Enter}');
    expect(
      await screen.findByText(/hidden by your filters/, { selector: '.hidden-note' }),
    ).toBeInTheDocument();
    await user.click(statusButton('Pending'));
    expect(listedTitles()).toContain('New one');
    expect(hiddenNote()).toBeNull();
  });

  it('"Back to tasks" keeps the filters (from the link and from Edit)', async () => {
    const { user } = await renderApp(tasks, { route: '/?priority=high&q=milk' });
    await user.click(taskLink('Buy milk'));
    await user.click(screen.getByRole('link', { name: /Back to tasks/ }));
    expect(currentUrl()).toBe('/?priority=high&q=milk');
    expect(listedTitles()).toEqual(['Buy milk']);

    await user.click(screen.getByRole('link', { name: 'Edit Buy milk' }));
    expect(screen.getByRole('link', { name: /Back to tasks/ })).toHaveAttribute(
      'href',
      '/?priority=high&q=milk',
    );
  });

  it('every control has a label', async () => {
    await renderApp(tasks);
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
    expect(prioritySelect()).toBeInTheDocument();
    expect(searchBox()).toBeInTheDocument();
  });
});
