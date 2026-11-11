import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advanceTimers,
  restoreRealTimers,
  useFakeTimersWithTestingLibrary,
} from './test/fakeTimers';
import { makeTask } from './test/makeTask';
import { detailPanel, listedTitles, liveRegion, renderApp } from './test/renderApp';
import type { Task } from './types';

// Sorted by due date, so the list order is A, B, C.
const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' }),
  makeTask({ id: 'c', title: 'Task C', dueDate: '2026-11-13' }),
];

beforeEach(() => {
  useFakeTimersWithTestingLibrary();
});

afterEach(() => {
  restoreRealTimers();
  vi.restoreAllMocks();
});

function setup(initialTasks: Task[] = tasks) {
  return renderApp(initialTasks, { advanceTimers });
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function undoButton() {
  return screen.queryByRole('button', { name: 'Undo' });
}

describe('App: deleting tasks', () => {
  it('deletes without a confirm dialog, shows the Undo bar and announces it', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));

    expect(listedTitles()).toEqual(['Task A', 'Task C']);
    expect(screen.getByText('Task deleted.')).toBeVisible();
    expect(undoButton()).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('Task deleted');
    expect(screen.getByText('0 of 2 done')).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('moves focus to the next task, then the previous one, then the list heading', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    expect(screen.getByRole('button', { name: /^Task C/ })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Delete Task C' }));
    expect(screen.getByRole('button', { name: /^Task A/ })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Delete Task A' }));
    expect(screen.getByRole('heading', { name: 'Tasks' })).toHaveFocus();
  });

  it('deleting every task shows the empty state again', async () => {
    const { user } = setup();
    for (const name of ['Task A', 'Task B', 'Task C']) {
      await user.click(screen.getByRole('button', { name: `Delete ${name}` }));
    }
    expect(screen.getByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('Undo puts the task back in the same place, announces it and focuses it', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    const undo = undoButton();
    expect(undo).not.toBeNull();
    if (undo === null) return;
    await user.click(undo);

    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
    expect(undoButton()).not.toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('Task restored');
    expect(screen.getByRole('button', { name: /^Task B/ })).toHaveFocus();
  });

  it('Undo still works after deleting everything (the old position no longer exists)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task C' }));
    await user.click(screen.getByRole('button', { name: 'Delete Task A' }));
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(listedTitles()).toEqual(['Task B']);
  });

  it('the Undo bar goes away after about 5 seconds', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    wait(4900);
    expect(undoButton()).toBeInTheDocument();
    wait(200);
    expect(undoButton()).not.toBeInTheDocument();
    expect(listedTitles()).toEqual(['Task A', 'Task C']);
  });

  it('pauses the timer while the bar is hovered and keeps the time left', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    const bar = screen.getByRole('group', { name: 'Undo delete' });

    wait(3000);
    await user.hover(bar);
    wait(20_000);
    expect(undoButton()).toBeInTheDocument();

    await user.unhover(bar);
    wait(1900);
    expect(undoButton()).toBeInTheDocument();
    wait(200);
    expect(undoButton()).not.toBeInTheDocument();
  });

  it('pauses the timer while the Undo button has keyboard focus', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    // Focus moved to Task C. The Undo bar sits just above the list, so from the
    // first task (A) one Shift+Tab reaches the Undo button.
    await user.click(screen.getByRole('button', { name: /^Task A/ }));
    await user.tab({ shift: true });
    expect(undoButton()).toHaveFocus();
    wait(20_000);
    expect(undoButton()).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(listedTitles()).toEqual(['Task A', 'Task B', 'Task C']);
    expect(screen.getByRole('button', { name: /^Task B/ })).toHaveFocus();
  });

  it('only the latest delete can be undone, and it gets a fresh 5 seconds', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task A' }));
    wait(4000);
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);

    wait(4000); // 8 s after the first delete, 4 s after the second
    expect(undoButton()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(listedTitles()).toEqual(['Task B', 'Task C']);
  });

  it('deleting the selected task clears the detail panel', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /^Task B/ }));
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    expect(within(detailPanel()).getByText('Select a task to see its details')).toBeInTheDocument();
  });

  it('deleting the task being edited cancels the edit without a crash', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit Task B' }));
    await user.type(within(detailPanel()).getByLabelText('Title'), ' changed');
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));

    expect(within(detailPanel()).queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /unsaved/ })).not.toBeInTheDocument();
    // After Undo the task comes back with its OLD values (the draft was not saved).
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(listedTitles()).toContain('Task B');
  });

  it('clears the timer when the app unmounts (no leak)', async () => {
    const { user, unmount } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
