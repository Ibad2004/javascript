import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import { deleteDialog, listedTitles, pageHeading, renderApp } from './test/renderApp';
import type { Task } from './types';

const LONG_TITLE = 'A'.repeat(100);

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' }),
  makeTask({ id: 'c', title: 'Task C', dueDate: '2026-11-13' }),
];

function rowDelete(title: string) {
  return screen.getByRole('button', { name: `Delete ${title}` });
}

function dialogButton(name: 'Cancel' | 'Delete') {
  return within(deleteDialog()).getByRole('button', { name });
}

describe('delete confirm dialog: list page', () => {
  it('Delete opens the dialog with the title and the Undo hint; focus starts on Cancel', async () => {
    const { user, server } = await renderApp(tasks);
    await user.click(rowDelete('Task B'));

    const dialog = deleteDialog();
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleName('Delete “Task B”?');
    expect(dialog).toHaveAccessibleDescription('This can be undone for 5 seconds.');
    expect(dialogButton('Cancel')).toHaveFocus();
    // Nothing happens until the user answers.
    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
    expect(server.writes()).toEqual([]);
  });

  it('Cancel closes it with no change, and focus goes back to the Delete button', async () => {
    const { user, server } = await renderApp(tasks);
    await user.click(rowDelete('Task B'));
    await user.click(dialogButton('Cancel'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
    expect(server.writes()).toEqual([]);
    expect(rowDelete('Task B')).toHaveFocus();
  });

  it('Escape does the same as Cancel', async () => {
    const { user, server } = await renderApp(tasks);
    await user.click(rowDelete('Task B'));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(server.writes()).toEqual([]);
    expect(rowDelete('Task B')).toHaveFocus();
  });

  it('a click on the dark backdrop cancels; a click inside the box does not', async () => {
    const { user, server } = await renderApp(tasks);
    await user.click(rowDelete('Task B'));
    await user.click(within(deleteDialog()).getByText('This can be undone for 5 seconds.'));
    expect(deleteDialog()).toBeInTheDocument();

    // The backdrop is part of the <dialog> element itself, outside its inner box.
    await user.click(deleteDialog());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(server.writes()).toEqual([]);
    expect(rowDelete('Task B')).toHaveFocus();
  });

  it('confirming deletes, keeps the Undo bar and focuses the next task', async () => {
    const { user, server } = await renderApp(tasks);
    await user.click(rowDelete('Task B'));
    await user.click(dialogButton('Delete'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Task C/ })).toHaveFocus();
    await waitFor(() => expect(server.writes()).toHaveLength(1));
  });

  it("a double click on the dialog's Delete deletes ONCE", async () => {
    const { user, server } = await renderApp(tasks);
    await user.click(rowDelete('Task B'));
    await user.dblClick(dialogButton('Delete'));

    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    await waitFor(() => expect(server.writes()).toHaveLength(1));
    expect(server.writes()[0]).toMatchObject({ method: 'DELETE', path: '/tasks/b' });
    // The next task was NOT deleted by the second click.
    expect(server.task('c')).toBeDefined();
  });

  it('a busy task opens no dialog', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await user.click(screen.getByRole('checkbox', { name: 'Mark Task B as done' }));
    await user.click(rowDelete('Task B'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    hold.release();
  });

  it('a 100-character title is shown whole in the dialog (the CSS wraps it)', async () => {
    const { user } = await renderApp([makeTask({ id: 'long', title: LONG_TITLE })]);
    await user.click(rowDelete(LONG_TITLE));
    expect(within(deleteDialog()).getByRole('heading')).toHaveTextContent(LONG_TITLE);
    expect(within(deleteDialog()).getByRole('heading')).toHaveClass('dialog-title');
  });

  it('Urdu titles keep their direction inside the question (<bdi>)', async () => {
    const urdu = 'ہفتہ وار رپورٹ';
    const { user } = await renderApp([makeTask({ id: 'u', title: urdu })]);
    await user.click(rowDelete(urdu));
    expect(deleteDialog().querySelector('bdi')).toHaveTextContent(urdu);
  });
});

describe('delete confirm dialog: task page', () => {
  it('Cancel keeps the page and puts focus back on Delete', async () => {
    const { user, server } = await renderApp(tasks, { route: '/tasks/b' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteDialog()).toHaveAccessibleName('Delete “Task B”?');
    expect(dialogButton('Cancel')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(pageHeading()).toHaveTextContent('Task B');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    expect(server.writes()).toEqual([]);
  });

  it('confirming deletes, goes back to the list and shows Undo there', async () => {
    const { user, server } = await renderApp(tasks, { route: '/tasks/b' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.dblClick(dialogButton('Delete'));

    expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    await waitFor(() => expect(server.writes()).toHaveLength(1));
  });
});
