# Task Tracker in Next.js (Day 23)

The Week 3 task tracker rebuilt with the Next.js App Router. Today: routing, layouts, server vs client components.
Tasks now come from MongoDB Atlas, read directly in server components. Day 23 adds create, edit, done and delete with server actions. Auth comes on Day 24, deploy on Day 25.

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
1. Copy `.env.example` to `.env.local` and put your own Atlas connection string in it (database name `task-tracker-next`).
2. `npm.cmd run seed` deletes and re-creates 8 sample tasks (due dates are relative to today: overdue, today, tomorrow, future, none).
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
