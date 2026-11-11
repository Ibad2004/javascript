import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { FAKE_TODAY, makeTask } from './test/makeTask';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Write report', done: false, dueDate: '2026-11-12' }),
  makeTask({ id: 'b', title: 'Call the bank', done: true, dueDate: '2026-11-01' }),
  makeTask({ id: 'c', title: 'Clean desk', done: true, dueDate: null }),
];

function renderApp(initialTasks: Task[] = tasks) {
  const user = userEvent.setup();
  render(<App initialTasks={initialTasks} today={FAKE_TODAY} />);
  return { user };
}

function toggleButton() {
  return screen.getByRole('button', { name: /done tasks$/ });
}

function detailPanel() {
  return screen.getByRole('region', { name: 'Task details' });
}

describe('App', () => {
  it('shows the empty-state message when there are no tasks', () => {
    renderApp([]);
    expect(screen.getByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists the tasks sorted: not-done first, then by due date', () => {
    renderApp();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Write report'),
      expect.stringContaining('Call the bank'),
      expect.stringContaining('Clean desk'),
    ]);
    expect(screen.getByText('Showing 3 tasks')).toBeInTheDocument();
  });

  it('toggles done tasks and updates aria-pressed', async () => {
    const { user } = renderApp();
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
    const { user } = renderApp();
    await user.click(toggleButton());
    expect(screen.getByText(/2 done tasks hidden/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show them' }));
    expect(screen.queryByText(/done tasks? hidden/)).not.toBeInTheDocument();
    expect(screen.getByText('Clean desk')).toBeInTheDocument();
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses the singular for one hidden task', async () => {
    const { user } = renderApp([makeTask({ id: 'x', done: true }), makeTask({ id: 'y' })]);
    await user.click(toggleButton());
    expect(screen.getByText(/1 done task hidden/)).toBeInTheDocument();
  });

  it('says clearly when every task is hidden', async () => {
    const { user } = renderApp([
      makeTask({ id: 'x', done: true }),
      makeTask({ id: 'y', done: true }),
    ]);
    await user.click(toggleButton());
    expect(screen.getByText('All 2 tasks are done, so they are all hidden.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show them' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a task in the detail panel and deselects it on a second click', async () => {
    const { user } = renderApp();
    const task = screen.getByRole('button', { name: /^Write report/ });

    await user.click(task);
    expect(task).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Write report' }),
    ).toBeInTheDocument();

    await user.click(task);
    expect(task).toHaveAttribute('aria-pressed', 'false');
    expect(within(detailPanel()).getByText('Select a task to see its details')).toBeInTheDocument();
  });

  it('selecting another task moves the selection', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /^Write report/ }));
    await user.click(screen.getByRole('button', { name: /^Clean desk/ }));
    expect(screen.getByRole('button', { name: /^Write report/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(detailPanel()).getByRole('heading', { name: 'Clean desk' })).toBeInTheDocument();
  });

  it('clears the detail (no stale task) when the filter hides the selected task', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /^Call the bank/ }));
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Call the bank' }),
    ).toBeInTheDocument();

    await user.click(toggleButton());
    expect(within(detailPanel()).getByText('Select a task to see its details')).toBeInTheDocument();
    expect(within(detailPanel()).queryByText('Call the bank')).not.toBeInTheDocument();
  });

  it('lets a keyboard user reach a task with Tab and select it with Enter', async () => {
    const { user } = renderApp();
    await user.tab(); // the toggle button
    await user.tab(); // the first task
    expect(screen.getByRole('button', { name: /^Write report/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Write report' }),
    ).toBeInTheDocument();
  });
});
