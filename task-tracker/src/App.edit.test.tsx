import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTask } from './test/makeTask';
import { liveRegion, pageHeading, renderApp, taskLink } from './test/renderApp';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({
    id: 'a',
    title: 'Write report',
    description: 'For Monday',
    priority: 'high',
    dueDate: '2026-11-12',
  }),
  makeTask({ id: 'b', title: 'Call the bank', dueDate: '2026-11-20' }),
];

function editTitle() {
  return screen.getByLabelText('Title');
}

function unsavedBar() {
  return screen.getByRole('group', { name: 'You have unsaved changes' });
}

function backLink() {
  return screen.getByRole('link', { name: /Back to tasks/ });
}

/** Opens the task's page from the list with its "Edit" link (the form opens at once). */
async function openEditFromList() {
  const result = await renderApp(tasks);
  await result.user.click(screen.getByRole('link', { name: 'Edit Write report' }));
  return result;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App: editing a task on its page', () => {
  it('"Edit" in the list opens the task page with the form prefilled and focus in the title', async () => {
    await openEditFromList();

    expect(pageHeading()).toHaveTextContent('Write report');
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
    expect(editTitle()).toHaveValue('Write report');
    expect(screen.getByLabelText('Description')).toHaveValue('For Monday');
    expect(screen.getByLabelText('Priority')).toHaveValue('high');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-11-12');
    expect(editTitle()).toHaveFocus();
  });

  it('the Edit button on the page opens the same form', async () => {
    const { user } = await renderApp(tasks, { route: '/tasks/a' });
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(editTitle()).toHaveValue('Write report');
    expect(editTitle()).toHaveFocus();
  });

  it('Save stores the trimmed values, announces it and puts focus back on Edit', async () => {
    const { user } = await openEditFromList();
    await user.clear(editTitle());
    await user.type(editTitle(), '  Write the report  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(pageHeading()).toHaveTextContent('Write the report');
    expect(liveRegion()).toHaveTextContent('Changes saved');
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
    expect(document.title).toBe('Write the report | Tasks');

    await user.click(backLink());
    expect(taskLink('Write the report')).toBeInTheDocument();
  });

  it('Escape cancels: old values kept, focus back on the Edit button', async () => {
    const { user } = await openEditFromList();
    await user.type(editTitle(), ' CHANGED{Escape}');

    expect(pageHeading()).toHaveTextContent('Write report');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  it('Cancel does the same as Escape', async () => {
    const { user } = await openEditFromList();
    await user.type(editTitle(), ' CHANGED');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(pageHeading()).toHaveTextContent('Write report');
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  it('cannot save an empty title (same validation as add)', async () => {
    const { user, server } = await openEditFromList();
    await user.clear(editTitle());
    await user.type(editTitle(), '   {Enter}');
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(editTitle()).toHaveFocus();
    expect(server.writes()).toHaveLength(0);
  });

  it('a duplicate title still warns (the form knows every task)', async () => {
    const { user } = await openEditFromList();
    await user.clear(editTitle());
    await user.type(editTitle(), 'Call the bank');
    expect(screen.getByText(/already/i)).toBeInTheDocument();
  });

  it('without changes, "Back to tasks" just leaves (no bar)', async () => {
    const { user } = await openEditFromList();
    await user.click(backLink());
    expect(pageHeading()).toHaveTextContent('Tasks');
    expect(screen.queryByRole('group', { name: /unsaved/ })).not.toBeInTheDocument();
  });

  describe('with unsaved changes, an in-app link asks first', () => {
    async function startDirtyEdit() {
      const confirmSpy = vi.spyOn(window, 'confirm');
      const alertSpy = vi.spyOn(window, 'alert');
      const result = await openEditFromList();
      await result.user.type(editTitle(), ' v2');
      return { ...result, confirmSpy, alertSpy };
    }

    it('"Back to tasks" shows the inline bar (no window.confirm) and keeps the edit', async () => {
      const { user, confirmSpy, alertSpy } = await startDirtyEdit();
      await user.click(backLink());

      expect(unsavedBar()).toBeInTheDocument();
      expect(unsavedBar()).toHaveFocus();
      expect(editTitle()).toHaveValue('Write report v2');
      expect(liveRegion()).toHaveTextContent('You have unsaved changes');
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('"Discard" drops the changes and then goes to the list', async () => {
      const { user, server } = await startDirtyEdit();
      await user.click(backLink());
      await user.click(within(unsavedBar()).getByRole('button', { name: 'Discard' }));

      expect(pageHeading()).toHaveTextContent('Tasks');
      expect(taskLink('Write report')).toBeInTheDocument();
      expect(server.writes()).toHaveLength(0);
    });

    it('"Save" saves first, then goes to the list', async () => {
      const { user } = await startDirtyEdit();
      await user.click(backLink());
      await user.click(within(unsavedBar()).getByRole('button', { name: 'Save' }));

      expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
      expect(liveRegion()).toHaveTextContent('Changes saved');
      expect(taskLink('Write report v2')).toBeInTheDocument();
    });

    it('"Save" in the bar with an invalid title shows the error and stays', async () => {
      const { user } = await startDirtyEdit();
      await user.clear(editTitle());
      await user.click(backLink());
      await user.click(within(unsavedBar()).getByRole('button', { name: 'Save' }));

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(unsavedBar()).toBeInTheDocument();
      expect(editTitle()).toHaveFocus();
    });

    it('undoing the change by hand means no bar', async () => {
      const { user } = await startDirtyEdit();
      await user.type(editTitle(), '{Backspace}{Backspace}{Backspace}');
      await user.click(backLink());
      expect(screen.queryByRole('group', { name: /unsaved/ })).not.toBeInTheDocument();
      expect(pageHeading()).toHaveTextContent('Tasks');
    });

    it('a Ctrl+click (new tab) is let through: nothing is lost here', async () => {
      const { user } = await startDirtyEdit();
      await user.keyboard('{Control>}');
      await user.click(backLink());
      await user.keyboard('{/Control}');
      expect(screen.queryByRole('group', { name: /unsaved/ })).not.toBeInTheDocument();
    });
  });
});
