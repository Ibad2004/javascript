import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import { pageHeading, renderApp as renderWithServer, taskLink } from './test/renderApp';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Write report', done: false, dueDate: '2026-11-12' }),
  makeTask({ id: 'b', title: 'Call the bank', done: true, dueDate: '2026-11-01' }),
  makeTask({ id: 'c', title: 'Clean desk', done: true, dueDate: null }),
];

/** The server starts with these tasks; resolves once the list has loaded. */
function renderApp(serverTasks: Task[] = tasks) {
  return renderWithServer(serverTasks);
}

function toggleButton() {
  return screen.getByRole('button', { name: /done tasks$/ });
}

describe('App', () => {
  it('shows the empty-state message when there are no tasks', async () => {
    await renderApp([]);
    expect(screen.getByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists the tasks sorted: not-done first, then by due date', async () => {
    await renderApp();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Write report'),
      expect.stringContaining('Call the bank'),
      expect.stringContaining('Clean desk'),
    ]);
    expect(screen.getByText('Showing 3 tasks')).toBeInTheDocument();
  });

  it('toggles done tasks and updates aria-pressed', async () => {
    const { user } = await renderApp();
    expect(toggleButton()).toHaveTextContent('Hide done tasks');
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggleButton());
    expect(toggleButton()).toHaveTextContent('Show done tasks');
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Call the bank')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 task')).toBeInTheDocument();

    await user.click(toggleButton());
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Call the bank')).toBeInTheDocument();
  });

  it('shows "N done tasks hidden" and the "Show them" button brings them back', async () => {
    const { user } = await renderApp();
    await user.click(toggleButton());
    expect(screen.getByText(/2 done tasks hidden/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show them' }));
    expect(screen.queryByText(/done tasks? hidden/)).not.toBeInTheDocument();
    expect(screen.getByText('Clean desk')).toBeInTheDocument();
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses the singular for one hidden task', async () => {
    const { user } = await renderApp([makeTask({ id: 'x', done: true }), makeTask({ id: 'y' })]);
    await user.click(toggleButton());
    expect(screen.getByText(/1 done task hidden/)).toBeInTheDocument();
  });

  it('says clearly when every task is hidden', async () => {
    const { user } = await renderApp([
      makeTask({ id: 'x', done: true }),
      makeTask({ id: 'y', done: true }),
    ]);
    await user.click(toggleButton());
    expect(screen.getByText('All 2 tasks are done, so they are all hidden.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show them' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('each task is a link; clicking it opens the task page (the old side panel is gone)', async () => {
    const { user } = await renderApp();
    expect(screen.queryByRole('region', { name: 'Task details' })).not.toBeInTheDocument();
    await user.click(taskLink('Write report'));
    expect(pageHeading()).toHaveTextContent('Write report');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lets a keyboard user reach a task with Tab and open it with Enter', async () => {
    const { user } = await renderApp();
    await user.tab(); // the toggle button
    await user.tab(); // the first task's "done" checkbox
    await user.tab(); // the first task's link
    expect(taskLink('Write report')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(pageHeading()).toHaveTextContent('Write report');
    expect(pageHeading()).toHaveFocus();
  });
});
