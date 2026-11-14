import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { startFakeServer } from './test/fakeServer';
import { FAKE_TODAY, makeTask } from './test/makeTask';
import { deleteDialog, inRouter, renderApp, waitForLoad } from './test/renderApp';
import type { Task } from './types';

const tasks: Task[] = [
  makeTask({ id: 'a', title: 'Write report', priority: 'high', dueDate: '2026-11-09' }),
  makeTask({ id: 'b', title: 'Call the bank', done: true, dueDate: '2026-11-10' }),
  makeTask({ id: 'c', title: 'ہفتہ وار رپورٹ جمع کروائیں', priority: 'low', dueDate: null }),
];

/**
 * Runs axe-core on the whole page and lists every violation as "rule: element".
 * color-contrast is off here only because jsdom does not apply CSS (axe can't measure it);
 * contrast is checked on the colour tokens in src/styles/styles.test.ts instead.
 */
async function axeViolations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
  );
}

describe('axe-core: zero violations', () => {
  it('the list page (with an overdue, a done and an Urdu task)', async () => {
    await renderApp(tasks);
    expect(await axeViolations()).toEqual([]);
  });

  it('the task page', async () => {
    await renderApp(tasks, { route: '/tasks/a' });
    expect(await axeViolations()).toEqual([]);
  });

  it('the task page with the edit form open', async () => {
    const { user } = await renderApp(tasks, { route: '/tasks/a' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await axeViolations()).toEqual([]);
  });

  it('Page not found', async () => {
    await renderApp(tasks, { route: '/no/such/page' });
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it('the error state (server off)', async () => {
    const server = startFakeServer(tasks);
    server.goOffline();
    render(inRouter(<App today={FAKE_TODAY} />));
    await waitForLoad();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it('the empty state', async () => {
    await renderApp([]);
    expect(screen.getByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it('the open delete dialog', async () => {
    const { user } = await renderApp(tasks);
    await user.click(screen.getByRole('button', { name: 'Delete Write report' }));
    expect(within(deleteDialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(await axeViolations()).toEqual([]);
  });

  it('the checker really finds problems (a button with no name)', async () => {
    render(<button type="button" />);
    expect(await axeViolations()).toEqual([expect.stringMatching(/^button-name:/)]);
  });
});
