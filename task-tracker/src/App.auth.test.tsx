import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { chooseSource } from './api';
import { AUTH_KEY } from './api/authStore';
import { SERVER_MESSAGES, SESSION_EXPIRED_MESSAGE, serverSource } from './api/serverApi';
import { startFakeTaskApi } from './test/fakeTaskApi';
import { FAKE_TODAY, makeTask } from './test/makeTask';
import { currentUrl, deleteAndConfirm, inRouter, listedTitles } from './test/renderApp';
import { safeFrom } from './utils/redirect';

const ALICE = 'alice@example.com';
const BOB = 'bob@example.com';
const PASSWORD = 'DemoPass123';

function twoUsers() {
  return startFakeTaskApi({
    [ALICE]: {
      password: PASSWORD,
      tasks: [
        makeTask({ id: 'a1', title: 'Alpha', done: true }),
        makeTask({ id: 'a2', title: 'Beta', dueDate: '2026-11-01' }),
      ],
    },
    [BOB]: { password: PASSWORD, tasks: [makeTask({ id: 'b1', title: 'Bobs task' })] },
  });
}

function renderServer(route = '/') {
  const user = userEvent.setup();
  const result = render(inRouter(<App today={FAKE_TODAY} source={serverSource} />, route));
  return { user, ...result };
}

function saveLogin(email: string) {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify({ token: `token-${email}`, email }));
}

async function logIn(user: ReturnType<typeof userEvent.setup>, email: string, password = PASSWORD) {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

async function waitForList() {
  await screen.findByRole('heading', { level: 1, name: 'Tasks' });
  await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());
}

describe('login', () => {
  it('saves the token, shows the tasks and sends the Bearer header', async () => {
    const api = twoUsers();
    const { user } = renderServer();
    expect(currentUrl()).toBe('/login?from=%2F');
    await logIn(user, ALICE);
    await waitForList();
    expect(listedTitles()).toEqual(['Beta', 'Alpha']);
    expect(JSON.parse(window.localStorage.getItem(AUTH_KEY) ?? '{}')).toEqual({
      token: `token-${ALICE}`,
      email: ALICE,
    });
    const taskRequest = api.requests.find((r) => r.path === '/tasks');
    expect(taskRequest?.authorization).toBe(`Bearer token-${ALICE}`);
    expect(screen.getByText(ALICE)).toBeInTheDocument();
  });

  it('a wrong password says "Invalid email or password" and stays on the page', async () => {
    twoUsers();
    const { user } = renderServer();
    await logIn(user, ALICE, 'wrong-password');
    expect(await screen.findAllByText(SERVER_MESSAGES.login)).not.toHaveLength(0);
    expect(currentUrl()).toContain('/login');
    expect(window.localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('a double click sends one request', async () => {
    const api = twoUsers();
    const { user } = renderServer();
    await user.type(await screen.findByLabelText('Email'), ALICE);
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.dblClick(screen.getByRole('button', { name: 'Log in' }));
    await waitForList();
    expect(api.requests.filter((r) => r.path === '/auth/login')).toHaveLength(1);
  });
});

describe('signup', () => {
  it('shows the password rule, has a show/hide button and logs in straight away', async () => {
    const api = twoUsers();
    const { user } = renderServer('/signup');
    expect(await screen.findByText('Use 8 to 72 characters.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'LongEnough1');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await waitForList();
    expect(api.users.has('new@example.com')).toBe(true);
  });

  it('409 shows "Email already registered" under the email field', async () => {
    twoUsers();
    const { user } = renderServer('/signup');
    await user.type(await screen.findByLabelText('Email'), ALICE);
    await user.type(screen.getByLabelText('Password'), 'LongEnough1');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    const error = await screen.findByText('Email already registered', { selector: '.field-error' });
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', error.id);
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('puts the API "fields" under each field and focuses the first', async () => {
    twoUsers();
    const { user } = renderServer('/signup');
    await user.type(await screen.findByLabelText('Email'), 'zod@example.com');
    await user.type(screen.getByLabelText('Password'), 'LongEnough1');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByText('email must be a valid email')).toBeInTheDocument();
    expect(screen.getByText('password is too weak')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('a short password is stopped in the browser, with focus on the field', async () => {
    const api = twoUsers();
    const { user } = renderServer('/signup');
    await user.type(await screen.findByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(
      screen.getByText('Password must be 8 to 72 characters', { selector: '.field-error' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    expect(api.requests.filter((r) => r.path === '/auth/signup')).toHaveLength(0);
  });
});

describe('password toggle and an empty form after logout', () => {
  it('the toggle switches name, aria-pressed, icon and field type, and hides again on submit', async () => {
    twoUsers();
    const { user } = renderServer('/login');
    const field = await screen.findByLabelText('Password');
    await user.type(field, 'abc');
    const show = screen.getByRole('button', { name: 'Show password' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
    await user.click(show);
    const hide = screen.getByRole('button', { name: 'Hide password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('icon-eye-slash')).toBeInTheDocument();
    expect(field).toHaveAttribute('type', 'text');
    expect(field).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('log in → log out → email and password are empty and hidden (login and signup autocomplete)', async () => {
    twoUsers();
    const { user } = renderServer('/login');
    expect(await screen.findByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    await logIn(user, ALICE);
    await waitForList();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('link', { name: 'Sign up' }));
    expect(await screen.findByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  });
});

describe('protected routes and "from"', () => {
  it('login → back to the page you wanted', async () => {
    twoUsers();
    const { user } = renderServer('/tasks/a2?x=1');
    expect(currentUrl()).toBe('/login?from=%2Ftasks%2Fa2%3Fx%3D1');
    await logIn(user, ALICE);
    expect(await screen.findByRole('heading', { level: 1, name: 'Beta' })).toBeInTheDocument();
    expect(currentUrl()).toBe('/tasks/a2?x=1');
  });

  it('only a path inside the app is allowed (open-redirect guard)', async () => {
    expect(safeFrom('/tasks/a?x=1')).toBe('/tasks/a?x=1');
    for (const bad of [
      '//evil.com',
      'https://evil.com',
      '/\\evil.com',
      'evil.com',
      '/\t/evil.com',
    ]) {
      expect(safeFrom(bad)).toBe('/');
    }
    twoUsers();
    const { user } = renderServer('/login?from=//evil.com');
    await logIn(user, ALICE);
    await waitForList();
    expect(currentUrl()).toBe('/');
  });

  it('already logged in → /login goes to /', async () => {
    twoUsers();
    saveLogin(ALICE);
    renderServer('/login');
    await waitForList();
    expect(currentUrl()).toBe('/');
  });
});

describe('expired token', () => {
  it('TOKEN_EXPIRED → login with the message, keeps "from", restores the typed draft', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    const { user } = renderServer();
    await waitForList();
    await user.type(screen.getByLabelText('Title'), 'Half typed task');
    api.expireToken(ALICE);
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument();
    expect(currentUrl()).toBe('/login?from=%2F');
    await logIn(user, ALICE);
    await waitForList();
    expect(screen.getByLabelText('Title')).toHaveValue('Half typed task');
  });

  it('a saved token that is no longer good is cleared at the start (GET /auth/me)', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    api.expireToken(ALICE);
    renderServer('/tasks/a1');
    expect(await screen.findByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument();
    expect(currentUrl()).toBe('/login?from=%2Ftasks%2Fa1');
    expect(window.localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});

describe('log out', () => {
  it('clears the token and drafts, and user B never sees the tasks of user A', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    const { user } = renderServer();
    await waitForList();
    expect(listedTitles()).toContain('Alpha');
    await user.type(screen.getByLabelText('Title'), 'Secret draft');
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(currentUrl()).toBe('/login');
    expect(window.localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();

    const gate = api.holdTaskList();
    await logIn(user, BOB);
    // B's list is still loading: none of A's data may be on the page, not even for a moment.
    expect(await screen.findByText('Loading tasks…')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    gate.release();
    await screen.findByText('Bobs task');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('logging out (or in) in another tab updates this tab', async () => {
    twoUsers();
    saveLogin(ALICE);
    renderServer();
    await waitForList();
    act(() => {
      window.localStorage.removeItem(AUTH_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: AUTH_KEY, newValue: null }));
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    act(() => {
      const saved = JSON.stringify({ token: `token-${BOB}`, email: BOB });
      window.localStorage.setItem(AUTH_KEY, saved);
      window.dispatchEvent(new StorageEvent('storage', { key: AUTH_KEY, newValue: saved }));
    });
    await screen.findByText('Bobs task');
  });
});

describe('stats bar', () => {
  it('shows the numbers for the browser time zone and refreshes after an add', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    const { user } = renderServer();
    expect(await screen.findByText('1 done · 1 pending · 1 overdue · 2 this week')).toBeVisible();
    const search = api.requests.find((r) => r.path === '/stats')?.search ?? '';
    expect(new URLSearchParams(search).get('tz')).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    await user.type(screen.getByLabelText('Title'), 'Gamma');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByText('1 done · 2 pending · 1 overdue · 3 this week')).toBeVisible();
  });

  it('a stats failure shows "Stats unavailable" and the list still works', async () => {
    const api = twoUsers();
    api.failStats();
    saveLogin(ALICE);
    renderServer();
    expect(await screen.findByText('Stats unavailable')).toBeVisible();
    await waitForList();
    expect(listedTitles()).toEqual(['Beta', 'Alpha']);
  });
});

describe('ids and Undo (the server makes the ids)', () => {
  it('add uses the id the server returns', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    const { user } = renderServer();
    await waitForList();
    await user.type(screen.getByLabelText('Title'), 'Gamma');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    const link = await screen.findByRole('link', { name: /^Gamma/ });
    expect(link).toHaveAttribute('href', '/tasks/srv-1');
    expect(api.tasksOf(ALICE).at(-1)?.id).toBe('srv-1');
  });

  it('Undo re-creates the task; the restored task can then be edited with its NEW id', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    const { user } = renderServer();
    await waitForList();
    await deleteAndConfirm(user, 'Delete Beta');
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    const link = await screen.findByRole('link', { name: /^Beta/ });
    await waitFor(() => expect(link).toHaveAttribute('href', '/tasks/srv-1'));
    await user.click(link);
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Beta edited');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.tasksOf(ALICE).map((t) => t.title)).toContain('Beta edited'));
    const patch = api.requests.find((r) => r.method === 'PATCH');
    expect(patch?.path).toBe('/tasks/srv-1');
  });
});

describe('errors and the other data sources', () => {
  it('the API off → a message with npm run dev, CORS_ORIGINS and Try again', async () => {
    const api = twoUsers();
    saveLogin(ALICE);
    api.goOffline();
    renderServer();
    expect(
      await screen.findByText(/Is task-api running\? \(npm run dev in task-api\)/, {
        selector: 'p',
      }),
    ).toBeVisible();
    expect(screen.getByText(/CORS_ORIGINS/, { selector: 'p' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('local mode (the Vercel build) has no login, no log-out button and no /login page', async () => {
    const user = userEvent.setup();
    render(inRouter(<App today={FAKE_TODAY} source={chooseSource('local')} />, '/login'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Go to your tasks' }));
    await waitForList();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
    expect(screen.queryByText(/done ·/)).not.toBeInTheDocument();
  });
});

describe('axe-core on the new pages', () => {
  async function violations(): Promise<string[]> {
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`));
  }

  it('login and signup: 0 violations (also with errors showing)', async () => {
    twoUsers();
    const { user } = renderServer('/login');
    await screen.findByLabelText('Email');
    expect(await violations()).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(within(document.body).getAllByText(/Enter your/)).not.toHaveLength(0);
    expect(await violations()).toEqual([]);
    await user.click(screen.getByRole('link', { name: 'Sign up' }));
    await screen.findByText('Use 8 to 72 characters.');
    expect(await violations()).toEqual([]);
  });
});
