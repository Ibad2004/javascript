import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { startFakeServer } from '../test/fakeServer';
import { makeTask } from '../test/makeTask';
import { TasksProvider, useTasksContext } from './TasksContext';

function TaskCount() {
  const { loadState, tasks } = useTasksContext();
  return <p>{loadState.status === 'ready' ? `${tasks.length} tasks` : 'loading'}</p>;
}

describe('TasksContext', () => {
  it('the provider loads the tasks once and shares them with every reader', async () => {
    const server = startFakeServer([makeTask({ id: 'a' }), makeTask({ id: 'b' })]);
    render(
      <TasksProvider>
        <TaskCount />
        <TaskCount />
      </TasksProvider>,
    );
    await waitFor(() => expect(screen.getAllByText('2 tasks')).toHaveLength(2));
    // Two readers, ONE hook call: one GET.
    expect(server.requests).toHaveLength(1);
  });

  it('useTasksContext throws a clear error outside the provider', () => {
    // React logs the thrown error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TaskCount />)).toThrow(
      'useTasksContext must be used inside <TasksProvider>.',
    );
  });
});
