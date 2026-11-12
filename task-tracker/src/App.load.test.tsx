import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { REQUEST_TIMEOUT_MS } from './api/tasks';
import {
  advanceTimers,
  restoreRealTimers,
  useFakeTimersWithTestingLibrary,
} from './test/fakeTimers';
import { hangingFetch, jsonResponse, mockFetch, networkError } from './test/fetchMock';
import { startFakeServer } from './test/fakeServer';
import { FAKE_TODAY, makeTask } from './test/makeTask';
import { listedTitles, liveRegion, renderApp, waitForLoad } from './test/renderApp';

const tasks = [
  makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' }),
  makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' }),
];

afterEach(() => {
  restoreRealTimers();
});

function tasksPanel() {
  return screen.getByRole('region', { name: 'Tasks' });
}

describe('App: loading the tasks (useEffect + fetch)', () => {
  it('loading → ready: shows "Loading tasks…" with aria-busy, then the list', async () => {
    startFakeServer(tasks);
    render(<App today={FAKE_TODAY} />);
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    expect(tasksPanel()).toHaveAttribute('aria-busy', 'true');
    // Nothing that needs the list is shown while it loads.
    expect(screen.queryByRole('region', { name: 'Add a task' })).not.toBeInTheDocument();
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();

    await waitForLoad();
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    expect(tasksPanel()).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('region', { name: 'Add a task' })).toBeInTheDocument();
  });

  it('an empty list from the server shows the existing "No tasks yet" state', async () => {
    await renderApp([]);
    expect(screen.getByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('server off at start → the message and "Try again"; Try again → ready', async () => {
    const server = startFakeServer(tasks);
    server.goOffline();
    const user = userEvent.setup();
    render(<App today={FAKE_TODAY} />);
    await waitForLoad();

    expect(
      screen.getByText("Can't reach the server. Is it running? (npm run api)"),
    ).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent("Couldn't load the tasks.");
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    server.goOnline();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitForLoad();
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('error → Try again → error again → Try again → ready', async () => {
    const server = startFakeServer(tasks);
    server.failNext(500);
    server.failNext(500);
    const user = userEvent.setup();
    render(<App today={FAKE_TODAY} />);
    await waitForLoad();
    expect(screen.getByText('The server had a problem. Try again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitForLoad();
    expect(screen.getByText('The server had a problem. Try again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitForLoad();
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    expect(server.requests).toHaveLength(3);
  });

  it('a double click on "Try again" sends ONE new request (the button goes away while loading)', async () => {
    const server = startFakeServer(tasks);
    server.failNext(500);
    const user = userEvent.setup();
    render(<App today={FAKE_TODAY} />);
    await waitForLoad();

    const hold = server.holdNext();
    await user.dblClick(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    hold.release();
    await waitForLoad();
    expect(server.requests).toHaveLength(2);
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
  });

  it('only the LATEST load counts: an aborted older answer is ignored', async () => {
    // StrictMode runs the effect twice in dev: request 1 is aborted, request 2 is used.
    const fetchSpy = mockFetch()
      .mockImplementationOnce(hangingFetch)
      .mockResolvedValueOnce(jsonResponse(tasks));
    const consoleError = vi.spyOn(console, 'error');
    render(
      <StrictMode>
        <App today={FAKE_TODAY} />
      </StrictMode>,
    );
    await waitForLoad();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    // The aborted request is not shown as an error, and nothing is logged.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('unmounting aborts the request; its answer never updates the page', async () => {
    let answer: (response: Response) => void = () => {};
    const fetchSpy = mockFetch().mockImplementation(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    const consoleError = vi.spyOn(console, 'error');
    const { unmount, container } = render(<App today={FAKE_TODAY} />);
    unmount();
    expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

    await act(async () => answer(jsonResponse(tasks)));
    expect(consoleError).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('a slow server: after 8 s "The server is taking too long", then Try again works', async () => {
    useFakeTimersWithTestingLibrary();
    const fetchSpy = mockFetch().mockImplementationOnce(hangingFetch);
    const user = userEvent.setup({ advanceTimers });
    render(<App today={FAKE_TODAY} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    });
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText('The server is taking too long')).toBeInTheDocument();

    fetchSpy.mockResolvedValueOnce(jsonResponse(tasks));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitForLoad();
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
  });

  it('non-JSON from the server is an error message, not a blank screen', async () => {
    mockFetch().mockResolvedValue(new Response('<!doctype html><p>Proxy error</p>'));
    render(<App today={FAKE_TODAY} />);
    await waitForLoad();
    expect(screen.getByText("The server sent data the app can't read.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('bad items in db.json are skipped with ONE small warning; the good ones are listed', async () => {
    await renderApp([
      ...tasks,
      { id: 'x', title: 42 },
      null,
      { ...tasks[0], title: 'Same id as Task A' },
    ]);
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    expect(
      screen.getByText('3 items in the saved data could not be read and were skipped.'),
    ).toBeInTheDocument();
  });

  it('one bad item uses the singular', async () => {
    await renderApp([...tasks, 'oops']);
    expect(
      screen.getByText('1 item in the saved data could not be read and was skipped.'),
    ).toBeInTheDocument();
  });

  it('reload keeps the changes (they live on the server, not in the page)', async () => {
    const first = await renderApp(tasks);
    await first.user.click(screen.getByRole('checkbox', { name: 'Mark Task A as done' }));
    await first.user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    first.unmount();

    // A "reload": a fresh App reading the same server data.
    const data = first.server.tasks;
    await renderApp(data);
    expect(listedTitles()).toEqual(['Task A']);
    expect(screen.getByRole('checkbox', { name: 'Mark Task A as done' })).toBeChecked();
  });

  it('the server stopping later does not blank the page: the list stays', async () => {
    const { user, server } = await renderApp(tasks);
    server.goOffline();
    await user.click(screen.getByRole('checkbox', { name: 'Mark Task A as done' }));
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    expect(
      within(tasksPanel()).getByText(/Can't reach the server\. Is it running\? \(npm run api\)/),
    ).toBeInTheDocument();
  });

  it('a network error on load never shows the raw "Failed to fetch"', async () => {
    mockFetch().mockImplementation(networkError);
    render(<App today={FAKE_TODAY} />);
    await waitForLoad();
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
  });
});
