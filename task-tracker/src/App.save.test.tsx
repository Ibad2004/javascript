import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import {
  addForm,
  listedTitles,
  liveRegion,
  pageHeading,
  renderApp,
  deleteAndConfirm,
} from './test/renderApp';

const tasks = [
  makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' }),
  makeTask({ id: 'c', title: 'Task C', dueDate: '2026-11-13' }),
];

const OFFLINE = "Can't reach the server. Is it running? (npm run api)";

function checkbox(title: string) {
  return screen.getByRole('checkbox', { name: `Mark ${title} as done` });
}

function addTitle() {
  return within(addForm()).getByLabelText('Title');
}

function notice() {
  return document.querySelector('.notice');
}

describe('App: adding waits for the server', () => {
  it('shows "Saving…" with a disabled button, then adds the task the server saved', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await user.type(addTitle(), '  Buy milk  {Enter}');

    const button = within(addForm()).getByRole('button', { name: 'Saving…' });
    expect(button).toBeDisabled();
    expect(listedTitles()).not.toContain('Buy milk');
    expect(addTitle()).toHaveValue('  Buy milk  ');

    hold.release();
    await waitFor(() => expect(listedTitles()).toContain('Buy milk'));
    expect(addTitle()).toHaveValue('');
    expect(liveRegion()).toHaveTextContent('Task added');
    expect(server.writes()).toEqual([
      {
        method: 'POST',
        path: '/tasks',
        body: {
          id: 'new-1',
          title: 'Buy milk',
          description: '',
          priority: 'medium',
          dueDate: null,
          done: false,
        },
      },
    ]);
  });

  it('a failed add shows the error and KEEPS the typed text; trying again works', async () => {
    const { user, server } = await renderApp(tasks);
    server.failNext(500);
    await user.type(addTitle(), 'Keep me');
    await user.type(within(addForm()).getByLabelText('Description'), 'My notes');
    await user.click(within(addForm()).getByRole('button', { name: 'Add task' }));

    const message = "Couldn't add the task. The server had a problem. Try again.";
    expect(within(addForm()).getByText(message)).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent(message);
    expect(addTitle()).toHaveValue('Keep me');
    expect(within(addForm()).getByLabelText('Description')).toHaveValue('My notes');
    expect(listedTitles()).not.toContain('Keep me');

    await user.click(within(addForm()).getByRole('button', { name: 'Add task' }));
    expect(listedTitles()).toContain('Keep me');
    expect(within(addForm()).queryByText(message)).not.toBeInTheDocument();
  });

  it('server off while adding: a clear message, the text stays', async () => {
    const { user, server } = await renderApp(tasks);
    server.goOffline();
    await user.type(addTitle(), 'Offline task{Enter}');
    expect(within(addForm()).getByText(`Couldn't add the task. ${OFFLINE}`)).toBeInTheDocument();
    expect(addTitle()).toHaveValue('Offline task');
  });

  it('a double click on "Add task" sends ONE request', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await user.type(addTitle(), 'Double');
    await user.dblClick(within(addForm()).getByRole('button', { name: 'Add task' }));
    hold.release();
    await waitFor(() => expect(listedTitles()).toContain('Double'));
    expect(server.writes()).toHaveLength(1);
    expect(listedTitles().filter((title) => title === 'Double')).toHaveLength(1);
  });
});

describe('App: editing (on the task page) waits for the server', () => {
  /** Opens task `id`'s page directly and clicks Edit. */
  async function openEdit(id = 'a') {
    const result = await renderApp(tasks, { route: `/tasks/${id}` });
    await result.user.click(screen.getByRole('button', { name: 'Edit' }));
    return result;
  }

  function editTitle() {
    return screen.getByLabelText('Title');
  }

  it('PATCHes ONLY the changed fields', async () => {
    const { user, server } = await openEdit();
    await user.type(editTitle(), ' v2');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(server.writes()).toEqual([
      { method: 'PATCH', path: '/tasks/a', body: { title: 'Task A v2', priority: 'high' } },
    ]);
    expect(pageHeading()).toHaveTextContent('Task A v2');
  });

  it('Save with no changes sends nothing and just closes the form', async () => {
    const { user, server } = await openEdit();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(server.writes()).toEqual([]);
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('shows "Saving…"; a failed save keeps the form open with the typed text', async () => {
    const { user, server } = await openEdit();
    await user.type(editTitle(), ' v2');
    const hold = server.holdNext();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();

    hold.fail(503);
    const message = "Couldn't save the changes. The server had a problem. Try again.";
    expect(await within(screen.getByRole('main')).findByText(message)).toBeInTheDocument();
    expect(editTitle()).toHaveValue('Task A v2');
    expect(pageHeading()).toHaveTextContent('Task A');
    expect(liveRegion()).toHaveTextContent(message);
  });

  it('a double click on Save sends ONE request', async () => {
    const { user, server } = await openEdit();
    await user.type(editTitle(), '!');
    const hold = server.holdNext();
    await user.dblClick(screen.getByRole('button', { name: 'Save' }));
    hold.release();
    await waitFor(() => expect(pageHeading()).toHaveTextContent('Task A!'));
    expect(server.writes()).toHaveLength(1);
  });

  it('404 (deleted in another tab): back to the list with the message, task removed', async () => {
    const { user, server } = await openEdit('b');
    await user.type(editTitle(), ' v2');
    server.deleteFromAnotherTab('b');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    // Only the add form is left on the list page.
    expect(screen.getAllByLabelText('Title')).toHaveLength(1);
    expect(notice()).toHaveTextContent('This task no longer exists');
    expect(liveRegion()).toHaveTextContent('This task no longer exists');
  });
});

describe('App: done is optimistic', () => {
  it('ticks at once, then PATCHes only { done }', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await user.click(checkbox('Task A'));
    expect(checkbox('Task A')).toBeChecked();
    hold.release();
    await waitFor(() => expect(server.task('a')).toMatchObject({ done: true }));
    expect(server.writes()).toEqual([{ method: 'PATCH', path: '/tasks/a', body: { done: true } }]);
  });

  it('a failed done rolls back and says so', async () => {
    const { user, server } = await renderApp(tasks);
    server.failNext(500);
    await user.click(checkbox('Task A'));

    expect(checkbox('Task A')).not.toBeChecked();
    expect(screen.getByText('0 of 3 done')).toBeInTheDocument();
    const message =
      "Couldn't save the change. The task is back as it was. The server had a problem. Try again.";
    expect(notice()).toHaveTextContent(message);
    expect(liveRegion()).toHaveTextContent(message);
  });

  it('a quick double "done" never sends overlapping requests; the server ends up right', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await user.dblClick(checkbox('Task A'));
    // The first click is still saving: the second one was ignored.
    expect(server.writes()).toHaveLength(1);
    expect(checkbox('Task A')).toBeChecked();
    expect(checkbox('Task A')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Delete Task A' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    hold.release();
    await waitFor(() => expect(checkbox('Task A')).toHaveAttribute('aria-disabled', 'false'));
    expect(server.task('a')).toMatchObject({ done: true });

    // Once it is done, the next click is a new, separate request.
    await user.click(checkbox('Task A'));
    expect(server.writes()).toHaveLength(2);
    expect(server.task('a')).toMatchObject({ done: false });
    expect(checkbox('Task A')).not.toBeChecked();
  });

  it('Delete does nothing while that task is saving', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await user.click(checkbox('Task A'));
    await user.click(screen.getByRole('button', { name: 'Delete Task A' }));
    expect(listedTitles()).toContain('Task A');
    hold.release();
    await waitFor(() => expect(checkbox('Task A')).toHaveAttribute('aria-disabled', 'false'));
    expect(server.writes()).toHaveLength(1);
  });

  it('404 on done: message and the task is removed', async () => {
    const { user, server } = await renderApp(tasks);
    server.deleteFromAnotherTab('b');
    await user.click(checkbox('Task B'));
    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    expect(notice()).toHaveTextContent('This task no longer exists');
  });

  it('the message can be dismissed', async () => {
    const { user, server } = await renderApp(tasks);
    server.failNext(500);
    await user.click(checkbox('Task A'));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(notice()).toBeNull();
  });
});

describe('App: delete is optimistic, Undo re-creates', () => {
  it('a failed delete puts the task back with "Couldn\'t delete. The task is back."', async () => {
    const { user, server } = await renderApp(tasks);
    server.goOffline();
    await deleteAndConfirm(user, 'Delete Task B');

    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(notice()).toHaveTextContent(`Couldn't delete. The task is back. ${OFFLINE}`);
    expect(liveRegion()).toHaveTextContent("Couldn't delete. The task is back.");
  });

  it('Undo re-creates the task on the server with the SAME id and fields', async () => {
    const { user, server } = await renderApp(tasks);
    await deleteAndConfirm(user, 'Delete Task B');
    expect(server.task('b')).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
    expect(server.writes()[1]).toEqual({ method: 'POST', path: '/tasks', body: tasks[1] });
    expect(server.task('b')).toEqual(tasks[1]);
  });

  it('Undo waits while the DELETE is still running (no overlapping requests)', async () => {
    const { user, server } = await renderApp(tasks);
    const hold = server.holdNext();
    await deleteAndConfirm(user, 'Delete Task B');
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toHaveAttribute('aria-disabled', 'true');
    await user.click(undo);
    expect(server.writes()).toHaveLength(1);

    hold.release();
    await waitFor(() => expect(undo).toHaveAttribute('aria-disabled', 'false'));
    await user.click(undo);
    expect(server.writes().map((request) => request.method)).toEqual(['DELETE', 'POST']);
    expect(listedTitles()).toContain('Task B');
  });

  it('if Undo fails it says so, the task stays gone and Undo is offered again', async () => {
    const { user, server } = await renderApp(tasks);
    await deleteAndConfirm(user, 'Delete Task B');
    server.failNext(500);
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    expect(notice()).toHaveTextContent("Couldn't restore the task.");
    expect(liveRegion()).toHaveTextContent("Couldn't restore the task.");
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
  });

  it('404 on delete (already deleted in another tab): message, no Undo', async () => {
    const { user, server } = await renderApp(tasks);
    server.deleteFromAnotherTab('b');
    await deleteAndConfirm(user, 'Delete Task B');
    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    expect(notice()).toHaveTextContent('This task no longer exists');
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});
