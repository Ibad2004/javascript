import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTask } from './test/makeTask';
import { detailPanel, listedTitles, liveRegion, renderApp } from './test/renderApp';
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
  return within(detailPanel()).getByLabelText('Title');
}

function unsavedBar() {
  return screen.getByRole('group', { name: 'You have unsaved changes' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App: editing tasks', () => {
  it('"Edit" opens the task prefilled in the detail panel, with focus in the title', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));

    expect(within(detailPanel()).getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
    expect(editTitle()).toHaveValue('Write report');
    expect(within(detailPanel()).getByLabelText('Description')).toHaveValue('For Monday');
    expect(within(detailPanel()).getByLabelText('Priority')).toHaveValue('high');
    expect(within(detailPanel()).getByLabelText('Due date')).toHaveValue('2026-11-12');
    expect(editTitle()).toHaveFocus();
    expect(screen.getByRole('button', { name: /^Write report/ })).toHaveTextContent('Editing');
  });

  it('Save stores the trimmed values, announces it and puts focus back on the task', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));
    await user.clear(editTitle());
    await user.type(editTitle(), '  Write the report  ');
    await user.click(within(detailPanel()).getByRole('button', { name: 'Save' }));

    expect(listedTitles()).toContain('Write the report');
    expect(liveRegion()).toHaveTextContent('Changes saved');
    expect(screen.getByRole('button', { name: /^Write the report/ })).toHaveFocus();
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Write the report' }),
    ).toBeInTheDocument();
  });

  it('Escape cancels: old values kept, focus back on the Edit button', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));
    await user.type(editTitle(), ' CHANGED{Escape}');

    expect(listedTitles()).toContain('Write report');
    expect(within(detailPanel()).queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Write report' })).toHaveFocus();
  });

  it('Cancel does the same as Escape', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));
    await user.type(editTitle(), ' CHANGED');
    await user.click(within(detailPanel()).getByRole('button', { name: 'Cancel' }));
    expect(listedTitles()).toContain('Write report');
    expect(screen.getByRole('button', { name: 'Edit Write report' })).toHaveFocus();
  });

  it('cannot save an empty title (same validation as add)', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));
    await user.clear(editTitle());
    await user.type(editTitle(), '   {Enter}');
    expect(within(detailPanel()).getByText('Title is required')).toBeInTheDocument();
    expect(listedTitles()).toContain('Write report');
    expect(editTitle()).toHaveFocus();
  });

  it('only one task is edited at a time (no changes: the switch is direct)', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));
    await user.click(screen.getByRole('button', { name: 'Edit Call the bank' }));
    expect(within(detailPanel()).getAllByLabelText('Title')).toHaveLength(1);
    expect(editTitle()).toHaveValue('Call the bank');
  });

  it('selecting another task without changes closes the edit', async () => {
    const { user } = renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Edit Write report' }));
    await user.click(screen.getByRole('button', { name: /^Call the bank/ }));
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Call the bank' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /unsaved/ })).not.toBeInTheDocument();
  });

  describe('with unsaved changes', () => {
    async function startDirtyEdit() {
      const confirmSpy = vi.spyOn(window, 'confirm');
      const alertSpy = vi.spyOn(window, 'alert');
      const result = renderApp(tasks);
      await result.user.click(screen.getByRole('button', { name: 'Edit Write report' }));
      await result.user.type(editTitle(), ' v2');
      return { ...result, confirmSpy, alertSpy };
    }

    it('selecting another task shows the inline bar (no window.confirm) and keeps the edit', async () => {
      const { user, confirmSpy, alertSpy } = await startDirtyEdit();
      await user.click(screen.getByRole('button', { name: /^Call the bank/ }));

      expect(unsavedBar()).toBeInTheDocument();
      expect(unsavedBar()).toHaveFocus();
      expect(editTitle()).toHaveValue('Write report v2');
      expect(liveRegion()).toHaveTextContent('You have unsaved changes');
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('"Discard" drops the changes and then selects the other task', async () => {
      const { user } = await startDirtyEdit();
      await user.click(screen.getByRole('button', { name: /^Call the bank/ }));
      await user.click(within(unsavedBar()).getByRole('button', { name: 'Discard' }));

      expect(listedTitles()).toContain('Write report');
      expect(
        within(detailPanel()).getByRole('heading', { name: 'Call the bank' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Call the bank/ })).toHaveFocus();
    });

    it('"Save" saves first, then selects the other task', async () => {
      const { user } = await startDirtyEdit();
      await user.click(screen.getByRole('button', { name: /^Call the bank/ }));
      await user.click(within(unsavedBar()).getByRole('button', { name: 'Save' }));

      expect(listedTitles()).toContain('Write report v2');
      expect(liveRegion()).toHaveTextContent('Changes saved');
      expect(
        within(detailPanel()).getByRole('heading', { name: 'Call the bank' }),
      ).toBeInTheDocument();
    });

    it('clicking Edit on another task also asks, and "Save" then opens that task', async () => {
      const { user } = await startDirtyEdit();
      await user.click(screen.getByRole('button', { name: 'Edit Call the bank' }));
      expect(unsavedBar()).toBeInTheDocument();

      await user.click(within(unsavedBar()).getByRole('button', { name: 'Save' }));
      expect(listedTitles()).toContain('Write report v2');
      expect(editTitle()).toHaveValue('Call the bank');
    });

    it('"Save" in the bar with an invalid title shows the error and stays', async () => {
      const { user } = await startDirtyEdit();
      await user.clear(editTitle());
      await user.click(screen.getByRole('button', { name: /^Call the bank/ }));
      await user.click(within(unsavedBar()).getByRole('button', { name: 'Save' }));

      expect(within(detailPanel()).getByText('Title is required')).toBeInTheDocument();
      expect(unsavedBar()).toBeInTheDocument();
      expect(editTitle()).toHaveFocus();
    });

    it('undoing the change by hand means no bar', async () => {
      const { user } = await startDirtyEdit();
      await user.type(editTitle(), '{Backspace}{Backspace}{Backspace}');
      await user.click(screen.getByRole('button', { name: /^Call the bank/ }));
      expect(screen.queryByRole('group', { name: /unsaved/ })).not.toBeInTheDocument();
    });
  });
});
