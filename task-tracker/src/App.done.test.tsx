import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import { listedTitles, liveRegion, renderApp, taskLink } from './test/renderApp';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' }),
  makeTask({ id: 'c', title: 'Task C', done: true, dueDate: '2026-11-13' }),
];

function checkbox(title: string) {
  return screen.getByRole('checkbox', { name: `Mark ${title} as done` });
}

describe('App: marking tasks done', () => {
  it('ticking updates the summary live and announces it; unticking too', async () => {
    const { user } = await renderApp(tasks);
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
    const { user } = await renderApp(tasks);
    checkbox('Task B').focus();
    await user.keyboard(' ');
    expect(checkbox('Task B')).toBeChecked();
  });

  it('a done task moves below the not-done ones (the list stays sorted)', async () => {
    const { user } = await renderApp(tasks);
    await user.click(checkbox('Task A'));
    expect(listedTitles()).toEqual(['Task B', 'Task A', 'Task C']);
  });

  it('with "Pending" on, a ticked task leaves the list and the message says why', async () => {
    const { user } = await renderApp(tasks, { route: '/?status=pending' });
    await user.click(checkbox('Task A'));
    expect(listedTitles()).toEqual(['Task B']);
    const message = 'Task marked done, but hidden by your filters.';
    expect(liveRegion()).toHaveTextContent(message);
    expect(screen.getByText(message, { selector: '.hidden-note' })).toBeInTheDocument();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();
    // Focus does not get lost with the removed checkbox.
    expect(taskLink('Task B')).toHaveFocus();
  });

  it('hiding the very last visible task moves focus to the list heading', async () => {
    const { user } = await renderApp([makeTask({ id: 'x', title: 'Only one' })], {
      route: '/?status=pending',
    });
    await user.click(checkbox('Only one'));
    expect(screen.getByText(/No tasks match these filters/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tasks' })).toHaveFocus();
  });

  it('lost update: on the task page, open Edit, tick done, click Save -> it stays done', async () => {
    const { user } = await renderApp(tasks, { route: '/tasks/a' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Title'), ' edited');

    await user.click(screen.getByRole('checkbox', { name: 'Mark as done' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('checkbox', { name: 'Mark as done' })).toBeChecked();
    await user.click(screen.getByRole('link', { name: /Back to tasks/ }));
    expect(checkbox('Task A edited')).toBeChecked();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
  });
});
