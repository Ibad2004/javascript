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
    expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
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
    await user.tab(); // status: All
    await user.tab(); // status: Pending
    await user.tab(); // status: Done
    await user.tab(); // the priority select
    await user.tab(); // the search box
    await user.tab(); // the first task's "done" checkbox
    await user.tab(); // the first task's link
    expect(taskLink('Write report')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(pageHeading()).toHaveTextContent('Write report');
    expect(pageHeading()).toHaveFocus();
  });
});
