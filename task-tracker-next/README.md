# Task Tracker in Next.js (Day 22)

The Week 3 task tracker rebuilt with the Next.js App Router. Today: routing, layouts, server vs client components.
Tasks now come from MongoDB Atlas, read directly in server components. Server actions come on Day 23, auth on Day 24, deploy on Day 25.

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
| `TaskList`, `TaskItem`, `TaskSummary`, `TaskDetail` | server | Only render the filtered sample data; nothing to click. |
| `SearchBox` | client | Typing state, a debounce timer and `router.replace` to update the URL. |
| `FilterControls` | client | Click and change handlers that change the URL through the router. |
| `AddTaskForm` | client | Controlled inputs, validation and focus (not saving yet). |
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
