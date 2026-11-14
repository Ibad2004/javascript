import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { LOCAL_MESSAGES, STORAGE_KEY, createLocalSource } from './api/localTasks';
import { FakeStorage } from './test/fakeStorage';
import { FAKE_TODAY, makeTask } from './test/makeTask';
import {
  addForm,
  deleteDialog,
  inRouter,
  listedTitles,
  liveRegion,
  pageHeading,
  renderApp,
  waitForLoad,
} from './test/renderApp';

const a = makeTask({ id: 'a', title: 'Task A', dueDate: '2026-11-11' });
const b = makeTask({ id: 'b', title: 'Task B', dueDate: '2026-11-12' });

/** The App in "local" mode (VITE_DATA_SOURCE=local), on a fake localStorage. */
async function renderLocal({
  saved,
  storage = new FakeStorage(),
  blocked = false,
}: { saved?: string; storage?: FakeStorage; blocked?: boolean } = {}) {
  if (saved !== undefined) storage.data.set(STORAGE_KEY, saved);
  const source = createLocalSource({
    getStorage: () => (blocked ? null : storage),
    today: () => FAKE_TODAY,
    eventTarget: window,
  });
  const user = userEvent.setup();
  let nextId = 0;
  render(inRouter(<App today={FAKE_TODAY} source={source} makeId={() => `new-${++nextId}`} />));
  await waitForLoad();
  return { user, storage, saved: () => JSON.parse(storage.data.get(STORAGE_KEY) ?? 'null') };
}

function notice() {
  return document.querySelector('.notice');
}

describe('App with browser storage (VITE_DATA_SOURCE=local)', () => {
  it('the header says where the data lives; a first visit shows the 8 sample tasks', async () => {
    const { saved } = await renderLocal();
    expect(screen.getByText('Saved in this browser')).toBeVisible();
    expect(listedTitles()).toHaveLength(8);
    expect(saved()).toHaveLength(8);
  });

  it('adding, ticking and deleting are saved in storage', async () => {
    const { user, saved } = await renderLocal({ saved: JSON.stringify([a, b]) });
    await user.type(within(addForm()).getByLabelText('Title'), 'New one{Enter}');
    await user.click(screen.getByRole('checkbox', { name: 'Mark Task A as done' }));
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    await user.click(within(deleteDialog()).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(saved()).toEqual([
        { ...a, done: true },
        expect.objectContaining({ id: 'new-1', title: 'New one' }),
      ]),
    );
  });

  it('damaged storage: the samples, a message on the page, never a blank page', async () => {
    await renderLocal({ saved: '{oops' });
    expect(listedTitles()).toHaveLength(8);
    expect(notice()).toHaveTextContent(LOCAL_MESSAGES.damaged);
    expect(liveRegion()).toHaveTextContent('could not be read');
  });

  it('bad items: the same "skipped" warning as with json-server', async () => {
    await renderLocal({ saved: JSON.stringify([a, { id: 'x' }, b]) });
    expect(listedTitles()).toEqual(['Task A', 'Task B']);
    expect(
      screen.getByText('1 item in the saved data could not be read and was skipped.'),
    ).toBeInTheDocument();
  });

  it("blocked storage: the app works in memory and says changes can't be saved", async () => {
    const { user } = await renderLocal({ blocked: true });
    expect(notice()).toHaveTextContent("Changes can't be saved in this browser");
    await user.type(within(addForm()).getByLabelText('Title'), 'Still works{Enter}');
    expect(listedTitles()).toContain('Still works');
    expect(notice()).toHaveTextContent("Changes can't be saved in this browser");
  });

  it("full storage: the tick stays on screen, with the can't-save message", async () => {
    const storage = new FakeStorage();
    const { user } = await renderLocal({ saved: JSON.stringify([a]), storage });
    storage.full = true;
    await user.click(screen.getByRole('checkbox', { name: 'Mark Task A as done' }));
    expect(screen.getByRole('checkbox', { name: 'Mark Task A as done' })).toBeChecked();
    expect(notice()).toHaveTextContent("Changes can't be saved in this browser");
  });

  it('another tab changes the tasks: the list reloads and it is announced', async () => {
    const { storage } = await renderLocal({ saved: JSON.stringify([a]) });
    storage.data.set(STORAGE_KEY, JSON.stringify([a, b]));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });
    await waitFor(() => expect(listedTitles()).toEqual(['Task A', 'Task B']));
    expect(liveRegion()).toHaveTextContent('The list was updated in another tab');
  });
});

describe('Reset demo data', () => {
  it('only exists with browser storage (not with json-server)', async () => {
    await renderApp([a]);
    expect(screen.queryByRole('button', { name: 'Reset demo data' })).not.toBeInTheDocument();
  });

  it('asks first; Cancel (or Escape) changes nothing and focus returns to the button', async () => {
    const { user, saved } = await renderLocal({ saved: JSON.stringify([a]) });
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }));
    expect(deleteDialog()).toHaveAccessibleName('Reset the demo data?');
    expect(within(deleteDialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset demo data' })).toHaveFocus();
    expect(saved()).toEqual([a]);
  });

  it('Reset puts the 8 sample tasks back, clears Undo and announces it', async () => {
    const { user, saved } = await renderLocal({ saved: JSON.stringify([a, b]) });
    await user.click(screen.getByRole('button', { name: 'Delete Task B' }));
    await user.click(within(deleteDialog()).getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }));
    await user.dblClick(within(deleteDialog()).getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(listedTitles()).toHaveLength(8));
    expect(saved()).toHaveLength(8);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('The demo data was reset');
    expect(pageHeading()).toHaveFocus();
  });
});
