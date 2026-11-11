import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import { detailPanel, listedTitles, liveRegion, renderApp } from './test/renderApp';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' }),
  makeTask({ id: 'c', title: 'Task C', done: true, dueDate: '2026-11-13' }),
];

function checkbox(title: string) {
  return screen.getByRole('checkbox', { name: `Mark ${title} as done` });
}

function hideDoneButton() {
  return screen.getByRole('button', { name: /done tasks$/ });
}

describe('App: marking tasks done', () => {
  it('ticking updates the summary live and announces it; unticking too', async () => {
    const { user } = renderApp(tasks);
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();

    await user.click(checkbox('Task A'));
    expect(checkbox('Task A')).toBeChecked();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('Task marked done');

    await user.click(checkbox('Task A'));
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('Task marked not done');
  });

  it('works with the keyboard (Space)', async () => {
    const { user } = renderApp(tasks);
    checkbox('Task B').focus();
    await user.keyboard(' ');
    expect(checkbox('Task B')).toBeChecked();
  });

  it('a done task moves below the not-done ones (the list stays sorted)', async () => {
    const { user } = renderApp(tasks);
    await user.click(checkbox('Task A'));
    expect(listedTitles()).toEqual(['Task B', 'Task A', 'Task C']);
  });

  it('with "Hide done tasks" on, a ticked task disappears and the hidden note updates', async () => {
    const { user } = renderApp(tasks);
    await user.click(hideDoneButton());
    expect(screen.getByText(/1 done task hidden/)).toBeInTheDocument();

    await user.click(checkbox('Task A'));
    expect(listedTitles()).toEqual(['Task B']);
    expect(liveRegion()).toHaveTextContent('Task marked done (hidden)');
    expect(screen.getByText(/2 done tasks hidden/)).toBeInTheDocument();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 task')).toBeInTheDocument();
    // Focus does not get lost with the removed checkbox.
    expect(screen.getByRole('button', { name: /^Task B/ })).toHaveFocus();
  });

  it('hiding the very last not-done task moves focus to the list heading', async () => {
    const { user } = renderApp([makeTask({ id: 'x', title: 'Only one' })]);
    await user.click(hideDoneButton());
    await user.click(checkbox('Only one'));
    expect(screen.getByText('Your only task is done, so it is hidden.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tasks' })).toHaveFocus();
  });

  it('lost update: open Edit, tick the task done, click Save -> it stays done', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Task A' }));
    const title = within(detailPanel()).getByLabelText('Title');
    await user.type(title, ' edited');

    await user.click(checkbox('Task A'));
    await user.click(within(detailPanel()).getByRole('button', { name: 'Save' }));

    expect(checkbox('Task A edited')).toBeChecked();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
  });

  it('ticking the edited task while done tasks are hidden keeps the edit form and its draft', async () => {
    const { user } = renderApp(tasks);
    await user.click(hideDoneButton());
    await user.click(screen.getByRole('button', { name: 'Edit Task A' }));
    await user.type(within(detailPanel()).getByLabelText('Title'), ' draft');
    await user.click(checkbox('Task A'));

    expect(listedTitles()).toEqual(['Task B']);
    expect(within(detailPanel()).getByLabelText('Title')).toHaveValue('Task A draft');
    await user.click(within(detailPanel()).getByRole('button', { name: 'Save' }));
    await user.click(hideDoneButton());
    expect(checkbox('Task A draft')).toBeChecked();
  });
});
