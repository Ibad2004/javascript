# Task Tracker in Next.js (Day 24)

The Week 3 task tracker rebuilt with the Next.js App Router. Today: routing, layouts, server vs client components.
Tasks now come from MongoDB Atlas, read directly in server components. Day 23 adds create, edit, done and delete with server actions. Day 24 adds sign up, log in, log out and per-user tasks. Deploy comes on Day 25.
The Day 21 to 23 sections describe the app as it was on that day; where they differ, the Day 24 section is current.

## Run
Needs Node 20.19 or newer.
```
npm.cmd install
npm.cmd run dev      # http://localhost:3000
npm.cmd run check    # lint + tests + build
```

## Folders and URLs
| Folder | URL |
|---|---|
| `src/app/(main)/page.tsx` | `/` the list (`?status=all|pending|done&priority=any|high|medium|low&q=text`) |
| `src/app/(main)/tasks/[id]/page.tsx` | `/tasks/<ObjectId>` the detail page (unknown id: not-found page) |
| `src/app/(auth)/login/page.tsx` | `/login` |
| `src/app/(auth)/signup/page.tsx` | `/signup` |
| `src/app/not-found.tsx` | any unknown URL |

## Layouts and route groups
- `app/layout.tsx` (root): html/body, global CSS, skip link, title template `%s | Tasks`.
- `(main)/layout.tsx`: the Header (name + nav) around the list and detail pages.
- `(auth)/layout.tsx`: a centered card with no main nav around login and signup.
- Route groups `(main)` and `(auth)` share no URL segment, so the URLs stay `/`, `/login` and `/signup`.
- Filters are read on the **server** from `searchParams` (unknown values become defaults, `q` is cut to 100 characters, matching is plain text so `c++` and Urdu work).

## Components: server or client?
Server by default. A client file starts with `"use client"` and one comment line saying why.
| Component | Kind | Why |
|---|---|---|
| Pages, layouts, `Header` | server | Static markup and data; no state or events. |
| `TaskList`, `TaskItem`, `TaskSummary`, `TaskDetail` | server | Only render data; the clickable parts are their own client components. |
| `SearchBox` | client | Typing state, a debounce timer and `router.replace` to update the URL. |
| `FilterControls` | client | Click and change handlers that change the URL through the router. |
| `AddTaskForm`, `TaskForm`, `TaskEditor` | client | Controlled inputs, pending state, focus and the edit mode. |
| `TaskToggle`, `DeleteTaskButton`, `ActionError` | client | Call server actions from events; open the dialog; refresh. |
| `PasswordField` | client | Show/hide toggle is state on the input type. |
| `DueBadge` | client | "Overdue" / "Due today" need the visitor's local date, not the server's. The server renders the plain date; the badge appears after mount, so there is no hydration mismatch. |
| `useFilterUrl`, `useLocalToday` | client hooks | Use `next/navigation` and the browser clock. |

## What broke on Day 21
- `create-next-app` turned on `cacheComponents`, and the build failed ("uncached or runtime data during prerendering") because `searchParams` was read outside `<Suspense>`. I removed that option to use the classic model (pages that read `searchParams` or a dynamic `[id]` are rendered on demand).
- Rewriting `tsconfig.json` with PowerShell `Set-Content -Encoding utf8` added a BOM and Turbopack could not parse it ("Can't resolve '@/...'"). Files are now written without a BOM.
- Peer dependency conflict: Vitest needs `@types/node` 22 or newer; the starter had 20, so I use `@types/node` 24.

## Day 22: real data from MongoDB Atlas
Server components read the database directly (no Express, no API route).

### Setup
1. Copy `.env.example` to `.env.local`. Put your own Atlas connection string in it (database name `task-tracker-next`) and your own `AUTH_SECRET` (see Day 24).
2. `npm.cmd run seed` creates the demo user and re-creates its 8 sample tasks (due dates are relative to today: overdue, today, tomorrow, future, none).
3. `npm.cmd run dev`.

`.env.local` is git-ignored (`.env*`; only `.env.example` is committed). The variable has **no** `NEXT_PUBLIC_` prefix, so it never reaches the browser, and the code never puts it in an error message. If it is missing you get: `MONGODB_URI is not set — see .env.example`.

The seed script refuses to delete anything unless the connected database is exactly `task-tracker-next`.

### Files
| File | Job |
|---|---|
| `src/lib/db.ts` | One cached mongoose connection on `globalThis` (hot reload does not open a new one each time). |
| `src/models/Task.ts` | Schema (timestamps, validation), `mongoose.models.Task ?? model(...)` to avoid `OverwriteModelError`. |
| `src/lib/taskQuery.ts` | Pure and unit-tested: URL filters to a MongoDB query, regex escaping, id check, document to plain object. |
| `src/lib/taskData.ts` | Server-only `getTasks(filters)`, `getTaskCounts()`, `getTaskById(id)`. |
| `scripts/seed.ts` | `npm.cmd run seed`. |

(`src/lib/tasks.ts` stayed the pure helper file that client components import, so the server-only data layer is `taskData.ts`.)

### SSR vs SSG in this app
| Route | Rendering | Why |
|---|---|---|
| `/tasks`, `/tasks/[id]` | **Dynamic (SSR)**, `export const dynamic = "force-dynamic"` | Fresh from the database on every request; reads `searchParams` / `params`. |
| `/about`, `/login`, `/signup` | **Static (SSG)**, prerendered at build | No data, same for everyone. |

Check with `npm.cmd run build`: the route table shows `○` (static) for `/about` and `ƒ` (dynamic) for `/tasks`.

Filters (status, priority, search) run **in the database query**. The search text is escaped before it becomes a regex, so `c++` or `((` are plain text. An invalid id (`/tasks/bad-id`) or a missing one gives a real 404. If the database cannot be reached, `error.tsx` shows a friendly message and a "Try again" button (no details). An empty database shows "No tasks yet".

### What broke on Day 22
- Vitest suddenly failed every file with "failed to find the current suite". The shell's working directory had a lowercase drive letter (`d:\...`) while Vitest used `D:/...`, so the same module was loaded twice. Running from `D:\...` fixed it.
- The first seed failed: the schema rejected my 110-character sample title (limit is 100). Validation worked; I shortened the title.
- `mongoose.models.Task ?? model(...)` made the model a union type that TypeScript could not call. Typing it as `Model<TaskDocument>` fixed it.
- `server-only` throws outside Next.js, so the seed script runs with `tsx --conditions=react-server`.
- `.gitignore` had `.env*`, which also hid `.env.example`; I added `!.env.example`.
- The old `sampleTasks.ts` is removed. `TaskSummary` and the filter counts now use database counts (`getTaskCounts`).

## Day 23: server actions (create, edit, toggle, delete)

### What is a server action?
An async function in a `"use server"` file. A client component imports and calls it like a normal function, but Next.js sends a `POST` request and the function runs **on the server**. There is no API route and no Express. `revalidatePath` inside the action makes the same response carry the freshly rendered page.

An action is a public endpoint: anyone can send that `POST` with any data. The checks in the form are only for the user's comfort, so **every action checks everything again**.

### How this app uses them
| Action (`src/app/actions/tasks.ts`) | Checks | Then |
|---|---|---|
| `createTask(input)` | zod schema | `insertTask` |
| `updateTask(id, input)` | id, then zod schema | `saveTask` (the four edited fields only, so `done` is kept) |
| `toggleTask(id)` | id | `toggleTaskDone` (flips in one database step) |
| `deleteTask(id, redirectToList?)` | id | `removeTask`; redirects to `/tasks` only when the second value is exactly `true` |

- Flow: component → action (validate) → `src/lib/taskData.ts` (database, server-only) → `revalidatePath("/tasks")` and `revalidatePath("/tasks/<id>")`.
- The answer is always `{ ok: true }` or `{ ok: false, message, fieldErrors? }`. A database error becomes "Could not save your change. Please try again."; only the error's name is logged.
- An invalid or missing id gives "This task no longer exists."
- `src/lib/taskSchema.ts` (server-only, zod): title trimmed, 1 to 100 characters; description up to 500; priority `low|medium|high`; due date `""` or a real `YYYY-MM-DD` date. It uses the same limits and character counting as the form (`src/lib/tasks.ts`). Unknown fields are dropped.
- `TaskForm` (add and edit) uses `useActionState`: "Saving…", a disabled button and a lock against double submits. It submits with `onSubmit`, so a failed save keeps the typed text. `callAction` also covers a request that never reaches the server.
- The done checkbox uses `aria-disabled` while saving, so the keyboard focus stays on it.
- Delete asks first in a modal `<dialog>`: Escape or Cancel returns the focus to the Delete button. After deleting from the list, the focus moves to the "Your tasks" heading.
- If a task was deleted in another tab, the message stays on screen. A **Refresh** button next to a failed toggle or delete then updates the page.

There is no login yet (Day 24), so anyone who can open the app can change the tasks. Do not deploy it before then.

### What broke on Day 23
- Mongoose `maxlength` counts UTF-16 units, but the form counts characters. A title of 60 emoji passed the form and would have failed in the database. The model now uses a validator with the same `countChars`.
- After deleting from the list, the focus fell to `<body>`: the dialog's `close` event arrives later and moved the focus back to the Delete button of the row that was being removed. `onClose` now returns the focus only when nothing was deleted. The unit tests did not catch it; a check in a real browser did.
- `<form action={...}>` resets the form after the action in React 19, so I submit with `onSubmit` and `startTransition` instead.

## Day 24: sign up, log in, log out and per-user tasks
Hand-rolled like the Week 4 API (no Express, no Auth.js): `bcryptjs` for passwords, `jose` for the signed token.

### Setup and demo login
Add `AUTH_SECRET` to `.env.local`: a random string of at least 32 characters. This prints one:
```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
If it is missing or too short you get: `AUTH_SECRET is missing or shorter than 32 characters — see .env.example`. The placeholder in `.env.example` is 31 characters, so it is rejected too.

Run `npm.cmd run seed`, then log in with **demo@example.com** / **DemoPass123**. This password is public and only for local testing: do not seed it into a deployed app. The seed resets the demo user's password and tasks, removes old tasks with no owner, and leaves other users alone.

### Cookie or localStorage?
| | `httpOnly` cookie (used here) | Token in `localStorage` (as a browser client of the Week 4 API might) |
|---|---|---|
| Can page JavaScript read it? | No. Injected script (XSS) cannot copy the token, although it can still send requests while the page is open. | Yes. One XSS bug can steal the token. |
| How is it sent? | The browser adds it automatically, also on the first page load, so server components know who you are. | JavaScript adds an `Authorization` header. A normal page load has none. |
| CSRF (another site makes your browser send a request) | Needs a defence: `sameSite: "lax"` leaves the cookie out of cross-site POSTs, and Next.js also compares `Origin` with the host on server actions. | Not sent automatically, so not a CSRF target. |

The cookie is `session`: `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`, 7 days. It holds a JWT (HS256, `sub` = user id, 7-day expiry). The token is signed, **not encrypted**, so only the user id is in it. Logout deletes the cookie. There is no server-side session list, so a copy of a token would keep working until it expires.

### How pages AND actions are protected
| Layer | File | What it does |
|---|---|---|
| Proxy (early check) | `src/proxy.ts` | GET/HEAD on `/tasks...` and `/about` without a valid token: 307 to `/login?next=...`. No database. Next.js 16 renamed `middleware.ts` to `proxy.ts`. |
| Pages | every page in `(main)` | `requirePageUser(path)`: verifies the cookie **and** that the user still exists. In the pages, not the layout, because a layout is not re-run on every navigation. |
| Actions | every task action | `requireUser()` comes first. Actions are public POST endpoints, so they never rely on the proxy. |
| Queries | `src/lib/taskData.ts` | Every function takes `ownerId` (from the session, never from the browser): list, counts, get, insert, update, toggle, delete. |

- Another user's task id gives the same answer as a missing one: the 404 page, or "This task no longer exists."
- `/login` and `/signup` send a logged-in user to `/tasks`. Those pages check this with the database; the proxy does not, otherwise a valid token of a deleted account would loop.
- `getCurrentUser()` treats a bad or expired token, or a deleted account, as logged out. A database error is not "logged out": it is shown as an error.
- `next` is used only if it is a path on this site (`src/lib/safeNext.ts`). Full URLs, `//host`, backslashes and control characters become `/tasks` (no open redirect). The action checks it again, because a hidden field can be edited.

### Passwords and login
- Emails are trimmed and lowercased and have a unique index. A duplicate (error 11000) becomes "An account with this email already exists".
- bcrypt cost 12. A password is 8 or more characters, at most 72 **bytes** (bcrypt ignores the rest) and not only spaces.
- An unknown email and a wrong password give the same "Email or password is incorrect". An unknown email is compared with a dummy hash, so the timing is similar.
- Sign up does say that an email is taken, so it can be used to find registered emails. Hiding that needs email verification.
- After 5 failed logins for one email within 15 minutes: "Too many attempts, try again later". The attempt is counted before the password check, so parallel requests cannot slip past. **Limits:** it is in memory (lost on restart, not shared between servers, so not enough for a serverless deploy), anyone can lock out someone else's email for 15 minutes, it does not limit one attacker trying many emails, and sign up is not limited.
- The login and signup forms use `<form action>`, so a submit before the JavaScript has loaded is still a POST, never a URL with the password in it.

`/about` is now rendered on demand (it reads the cookie), so the Day 22 "static" row now applies to none of the app's pages.

### What broke on Day 24
The final HTTP checks all passed. Most of these are traps found while reading the code and the Next.js docs, and designed around before they could fail; the old tasks and the old tests really did need fixing.
- A `redirect()` in the `/tasks` page answered **200**, because `loading.tsx` starts streaming first (the same problem as `/` on Day 21). `src/proxy.ts` gives logged-out visitors a real 307. A valid token of a deleted account still gets the 200 with a redirect inside, and no task data.
- `redirect()` works by throwing, and `runSafely` caught everything, so `requireUser()` inside it would have become "Could not save your change". It now calls `unstable_rethrow` first.
- An error in a layout skips `(main)/error.tsx`. Because the header now reads the user from the database, it catches that error and hides the account area, so the page's own error screen still works.
- Tasks created before today had no owner, so no user could see them. The seed removes them.
- The old `buildTaskQuery` tests stopped type-checking once the owner became a required argument. That is the point of making it required: no call can silently leave it out.
