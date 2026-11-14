# Task Tracker

**Summary:** a small task tracker built with Vite + React + TypeScript over Days 11-15. You can add, edit,
delete and filter tasks, open a task page, and see loading and error states. Locally the tasks are saved
on a mock server (json-server); the live demo on Vercel saves them in the browser. Needs **Node 20.19+**.
Run `npm run check` (lint, tests, build) before a commit.

**Contents:**
[How to run](#how-to-run) ·
[Deploy (Vercel)](#deploy-vercel) ·
[Component tree](#component-tree) ·
[Props, state and context](#props-state-and-context) ·
[Day 15](#day-15-the-look-responsive-layout-accessibility-a-delete-dialog-and-the-deploy) ·
[Day 14](#day-14-filters-a-task-page-and-a-usetasks-hook-react-router) ·
[Demo script](#demo-script-2-minutes-on-a-phone) ·
[Day 13](#day-13-the-tracker-reads-from-a-mock-api-json-server) ·
[Day 12](#day-12-add-edit-delete-and-mark-done-in-memory) ·
[Why keys matter](#why-keys-matter) ·
[Day 11 edge cases](#day-11-edge-cases-developer-side) ·
[Tests](#tests) ·
[What broke](#what-broke-on-day-15) ·
[Tech](#tech)

A small task tracker built with **Vite + React + TypeScript**.
This is a one-week project: every day I add to the **same app**.

| Day | What the day adds                                                                                         | Status                                                  |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 11  | Tracker pages with **static data**: components, JSX, props, state                                         | Done                                                    |
| 12  | Add, edit and delete tasks **in memory**: events, forms, controlled inputs, lists and keys                | Done                                                    |
| 13  | Read tasks from a mock API (**json-server**): `useEffect`, fetching, loading and error states             | Done                                                    |
| 14  | Filters, a task detail page and a `useTasks` hook: custom hooks, lifting state, context, **React Router** | Done                                                    |
| 15  | Styling, basic accessibility and a responsive layout, then deploy on **Vercel**                           | Done ([live demo](https://task-track-ibad.vercel.app/)) |

**Live demo:** [https://task-track-ibad.vercel.app/](https://task-track-ibad.vercel.app/)

The app has **two data sources with the same functions**: for local work the tasks are saved on a
mock server (json-server, `db.json`); the live demo on Vercel has no server, so there they are saved
in the browser (`localStorage`). Either way a page refresh keeps the changes, and the header says
where they are: "Saved on the local mock server (json-server)" or "Saved in this browser".

## How to run

You need Node.js. On Windows PowerShell use `npm.cmd` (the `npm.ps1` script is blocked by the
execution policy). The app lives in the `task-tracker/` folder of the `javascript` repo, so run
every command from inside that folder.

```powershell
cd task-tracker          # from the root of the javascript repo
npm.cmd install          # install dependencies
npm.cmd run db:reset     # build db.json from db.seed.json (dates relative to today)
npm.cmd run start:all    # json-server on :3001 + the Vite dev server; open the printed URL
npm.cmd test             # run the tests once (they never call a real server)
npm.cmd run check        # lint + tests + type check and production build
```

The two servers can also run in two terminals: `npm.cmd run api` and `npm.cmd run dev`.
`npm.cmd run api` builds `db.json` from the seed only if it does not exist yet, so your changes
survive a restart; `npm.cmd run db:reset` throws them away and starts over.

- `db.seed.json` is tracked by git. `db.json` (the live data) and `.env` are in `.gitignore`.
- To use another server URL, copy `.env.example` to `.env`, change `VITE_API_URL` and restart
  `npm.cmd run dev`. Without a `.env` the app uses `http://localhost:3001`.
- **Port 3001 busy** (`Error: listen EADDRINUSE ... port: 3001`): another json-server is probably
  still running, e.g. in another terminal. Stop it there with Ctrl+C, or find it with
  `netstat -ano | findstr :3001` and end that process in Task Manager. Or use another port:
  `npx.cmd json-server --watch db.json --port 3002` and put `VITE_API_URL=http://localhost:3002` in
  `.env`.

**The live version (browser storage) on your own PC**, exactly as Vercel builds it:

```powershell
npm.cmd run build        # uses .env.production: VITE_DATA_SOURCE=local
npx.cmd vite preview     # open the printed URL; no json-server needed
```

`VITE_DATA_SOURCE` picks the source: `api` (the default, json-server) or `local` (browser storage).
`.env.production` sets `local` for every production build; it holds no secrets, so it is committed
(`!.env.production` in `.gitignore`). To try browser storage in `npm.cmd run dev`, put
`VITE_DATA_SOURCE=local` in a `.env` file.

Other scripts: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run format`,
`npm.cmd run format:check`, `npm.cmd run test:watch`.

On Linux or macOS use plain `npm` (`npm ci`, `npm run dev`, `npm run check`). Vite 8 needs
**Node 20.19+ or 22.12+**. If `node --version` is older, install a newer one with
[nvm](https://github.com/nvm-sh/nvm): `nvm install 22`.

## Deploy (Vercel)

1. On vercel.com: **Add New → Project**.
2. Import the GitHub repository **Ibad2004/javascript**.
3. **Root Directory**: `task-tracker`. **Framework Preset**: Vite (the build command
   `npm run build` and the output folder `dist` are its defaults).
4. **Deploy**. Nothing else to set: `.env.production` switches the build to browser storage.

`vercel.json` rewrites every path to `/index.html`, so `/tasks/task-2` or `/?status=done` opened
from a shared link or after a reload gets the app (which then shows the page), not a Vercel 404.
Vercel serves real files (`/assets/…`) before the rewrite applies.

**Checked before deploying** (production build + `vite preview` in headless Edge, empty storage):
the header said "Saved in this browser" and 8 sample tasks were stored; a fresh load of
`/tasks/task-2` showed that task, `/?status=done` showed 3 tasks; ticking a task and reloading kept
it ticked; no request went to `:3001`; **0 console errors or warnings**. (`vite preview` has its own
fallback to `index.html`, so the rewrite itself is only proven on Vercel.)

## Component tree

```
BrowserRouter (main.tsx)   MemoryRouter in the tests
└── App
    └── TasksProvider      calls useTasks() ONCE; every page reads it with useTasksContext()
        └── AppRoutes      moves focus to the new page's <h1> after an in-app navigation
            ├── Header     title + where the data lives ("Saved in this browser" / "…mock server…")
            ├── Routes
            │   ├── "/"           TaskListPage
            │   │   ├── <p> / error box   "Loading tasks…" (aria-busy), or the error + [Try again]
            │   │   ├── TaskSummary       "3 of 8 done" (over ALL tasks, not the filtered ones)
            │   │   ├── Notice            a failed save or a 404, [Dismiss]
            │   │   ├── TaskFilters       Status [All (8)] [Pending (5)] [Done (3)] (aria-pressed),
            │   │   │                     "Filter by priority" select, "Search by title" box
            │   │   ├── <p role=status>   "Showing 2 of 8 tasks" or "No tasks yet…"
            │   │   ├── <p> hidden note   "Task added, but hidden by your filters. [Show all]"
            │   │   ├── UndoBar           "Task deleted. [Undo]" for 5 s (key = deleted task id)
            │   │   ├── <p> no match      "No tasks match these filters. [Clear filters]"
            │   │   ├── TaskList          the <ul>, key = task.id
            │   │   │   └── TaskItem      [checkbox] [link: title + info] [Edit link] [Delete]
            │   │   ├── TaskForm          ADD mode, clears after a save
│   │   └── ConfirmDeleteDialog  <dialog> "Delete “title”? … [Cancel] [Delete]" (only while asking)
            │   ├── "/tasks/:id"  TaskDetailPage (key = id)
            │   │   ├── "← Back to tasks" link (keeps the list's filters)
            │   │   ├── TaskDetail        the task (<h1> = title), or "Loading task…" / "Task not found"
            │   │   ├── UnsavedChangesBar "You have unsaved changes [Save] [Discard]"
            │   │   ├── TaskForm          EDIT mode, prefilled
│   │   └── ConfirmDeleteDialog  the same dialog for the page's Delete button
            │   └── "*"           NotFoundPage   "Page not found" + "Go to your tasks"
            └── LiveRegion  visually hidden role=status, outside the routes so messages survive a navigation
```

**One form for add and edit.** `TaskForm` takes `initialValues`, `submitLabel`, `onSubmit` and
`onCancel` (plus `tasks`, `today` and `editingId` for the warnings). Add and edit only differ in those
props, so the validation, counters and messages are written once.

**Why the row changed.** On Day 11 each task was one `<button>`. A checkbox or an Edit button _inside_
a `<button>` is invalid HTML (screen readers and browsers handle it badly), so each `<li>` has four
controls next to each other. Edit, Delete and the checkbox have the task title in their accessible
name ("Edit Buy milk", "Delete Buy milk", "Mark Buy milk as done"), so a screen reader list of
buttons is not just "Edit, Edit, Edit".

### Routes

| Path         | Page             | Notes                                                                                                                                                                         |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | `TaskListPage`   | Filters in the query: `?status=done&priority=high&q=milk`. Defaults are left out, so the plain list is `/`. Tab title "Tasks".                                                |
| `/tasks/:id` | `TaskDetailPage` | One task. A trailing slash works, odd ids are decoded (`/tasks/with%20space`). History state `edit: true` opens the form; `listSearch` keeps the filters for "Back to tasks". |
| `*`          | `NotFoundPage`   | "Page not found" and a link to the list.                                                                                                                                      |

Folders:

```
src/
  App.tsx                 TasksProvider + the routes
  main.tsx                reads today's date once and renders <BrowserRouter><App today={...} />
  types.ts                Priority, Task, TaskInput and TaskFormValues types
  api/tasks.ts            the ONLY file that calls fetch: getTasks, createTask, updateTask,
                          deleteTask, the type guard and the friendly errors
  hooks/useTasks.ts       all task state and actions (load, add, edit, done, delete, Undo, messages)
  hooks/                  also useDocumentTitle and useFocusHeadingOnNavigation
  context/TasksContext.tsx  TasksProvider + useTasksContext (throws outside the provider)
  pages/                  TaskListPage, TaskDetailPage, NotFoundPage
  components/             one component per file, each with typed props
  utils/filters.ts        Day 14: read/write the URL filters, search normalising, filterTasks, counts
  utils/tasks.ts          pure logic: addTask, updateTask, deleteTask, restoreTask, setDone,
                          validateTask, makeId, countChars, sorting, summary texts
  utils/                  also dates, plurals, page titles and the focus target ids
  test/                   test setup, makeTask(), renderApp() (MemoryRouter + a LocationProbe that
                          shows the URL and presses Back), the fake json-server, fake timers
db.seed.json              the 8 demo tasks with "dueInDays" (tracked by git)
db.json                   the live data json-server serves (ignored by git)
scripts/                  db.mjs + seed.mjs: build db.json from the seed with local dates
```

## Props, state and context

Since Day 14 the task state lives in **one custom hook, `useTasks`**, called once in
`TasksProvider`. The pages read it with `useTasksContext()` instead of passing it down through
props. The filters are **not** React state at all: they live in the URL.

| Data                                                  | Kind                        | Where it lives                     | Why                                                                                                                              |
| ----------------------------------------------------- | --------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tasks`                                               | state                       | useTasks → context                 | Both pages need it. Filled from the server, changed only with `setTasks((old) => ...)`.                                          |
| `loadState`, `loadAttempt`, `skippedCount`            | state                       | useTasks → context                 | Loading / error / ready; "Try again"; how many bad items the type guard dropped.                                                 |
| `busyIds` (+ `busyRef`)                               | state + ref                 | useTasks → TaskList → TaskItem     | Tasks with a request running. The ref answers at once (a double click), the state disables the row.                              |
| `notice`                                              | state                       | useTasks → Notice                  | The last failed save or a 404, until dismissed or the next action.                                                               |
| `filterNotice`                                        | state                       | useTasks → TaskListPage            | **Day 14.** `{ text, taskId }` of "…, but hidden by your filters." Cleared by the next action or any filter change.              |
| `lastDeleted`                                         | state                       | useTasks → UndoBar                 | `{ task, index }` of the latest delete, for Undo.                                                                                |
| `announcement`, `focusRequest`                        | state                       | useTasks → LiveRegion / an effect  | Screen reader text (with a counter, so the same text twice is read twice) and where focus goes next.                             |
| `status`, `priority`, `q`                             | **URL** (`useSearchParams`) | TaskListPage                       | **Day 14.** Reload, Back/Forward and a shared link keep them. The URL is the only copy; `readFilters` cleans it on every render. |
| `visibleTasks`, `counts`, `noMatch`                   | derived (not state)         | computed in TaskListPage           | `filterTasks(tasks, filters)` and `countByStatus(tasks)` during render. No effect, no second copy that could get out of sync.    |
| `isEditing`, `isDirty`, `pendingTo`                   | state                       | TaskDetailPage                     | The edit form, unsaved changes, and the link the user tried to follow while the form was dirty.                                  |
| `listPath`                                            | derived                     | TaskDetailPage                     | **Day 14.** `/` + the filters from history state, cleaned like the URL. Used by "Back to tasks", Delete and a 404.               |
| form values, `isSaving`, `submitError`, `triedSubmit` | state                       | each TaskForm                      | Every input is controlled; each form owns its own draft.                                                                         |
| `isHovered`, `hasFocus`                               | state                       | UndoBar                            | Either one pauses the 5 s timer.                                                                                                 |
| `today`                                               | prop                        | main.tsx → App → pages             | Read once outside React. Tests pass a fake date.                                                                                 |
| `makeId`                                              | prop (function)             | App → TasksProvider → useTasks     | `crypto.randomUUID()`; tests pass one that gives `new-1`, `new-2`, ...                                                           |
| `filters`, `counts`, `onStatusChange`, ...            | prop                        | TaskListPage → TaskFilters         | **Day 14.** TaskFilters only shows the filters and reports changes; the page writes the URL.                                     |
| `onToggleDone`, `onDelete`, `busy`                    | prop (callback)             | TaskListPage → TaskList → TaskItem | Children cannot change the state directly, so they call functions they are given.                                                |

State is never changed in place. Every update builds a new array or object with spread, `map`,
`filter` or `toSpliced`, and the pure functions in `src/utils/tasks.ts` are tested on **frozen**
arrays, so a mutation would throw in the test.

## Day 15: the look, responsive layout, accessibility, a delete dialog and the deploy

### What works now

- **Plain CSS + CSS variables**, no framework. `src/styles/tokens.css` holds every colour, the
  spacing scale, radii, font sizes and shadows. `base.css`, `layout.css` and `components.css` use
  only `var(--...)`; `src/index.css` just imports the four files in cascade order.
- **Light and dark theme**: the dark values are a second set of the same tokens under
  `@media (prefers-color-scheme: dark)`, so no component knows which theme is on.
- Tasks are **cards** with a coloured edge for the priority, **badges** that say the priority and
  "Overdue (was due …)" / "Due today" in words (colour is only a hint), and done tasks are struck
  through. Buttons come in three kinds: secondary (default), **primary** (Add task, Save) and
  **danger** (the dialog's Delete; the row's Delete is an outlined danger button).
- **Mobile first**: one column; the status buttons and fields wrap; Edit/Delete and the form
  buttons are full width on a phone. From 40rem the row actions sit beside the task; from 64rem the
  add form sits next to the list, inside a 72rem max width.
- **Delete asks first** with a native `<dialog>` and `showModal()`:
  "Delete “<title>”? This can be undone for 5 seconds." [Cancel] [Delete]. Focus starts on Cancel.
  Escape, Cancel or a click on the dark backdrop close it with no change, and focus goes back to the
  Delete button that opened it. After Delete the **Undo bar still appears** (the dialog stops
  accidents, Undo is for a change of mind). It works on the list and on the task page.
- A visible **focus ring** (3px, `--color-focus`) on every interactive element; it is never removed,
  only recoloured on the dark Undo bar.
- **Reduced motion**: with `prefers-reduced-motion: reduce` there is no smooth scroll, no
  transition and no dialog animation.

### Contrast (WCAG AA), checked by a test

`src/styles/styles.test.ts` reads `tokens.css`, computes the WCAG contrast ratio of every pair below
in **both** themes and fails under 4.5:1 for text or 3:1 for borders and the focus ring. These are
the real numbers:

| Text pair (must be ≥ 4.5)                       | Light | Dark  |
| ----------------------------------------------- | ----- | ----- |
| `--color-text` on `--color-bg`                  | 15.27 | 15.34 |
| `--color-text` on `--color-surface`             | 16.51 | 13.91 |
| `--color-text` on `--color-surface-muted`       | 14.57 | 12.02 |
| `--color-text-muted` on `--color-bg`            | 7.10  | 8.72  |
| `--color-text-muted` on `--color-surface`       | 7.68  | 7.91  |
| `--color-primary` on `--color-surface`          | 6.70  | 8.02  |
| `--color-primary` on `--color-bg`               | 6.20  | 8.85  |
| `--color-primary-hover` on `--color-surface`    | 8.72  | 10.32 |
| `--color-on-primary` on `--color-primary`       | 6.70  | 8.96  |
| `--color-on-primary` on `--color-primary-hover` | 8.72  | 11.53 |
| `--color-danger` on `--color-surface`           | 6.57  | 8.27  |
| `--color-on-danger` on `--color-danger`         | 6.57  | 9.46  |
| `--color-on-danger` on `--color-danger-hover`   | 8.66  | 12.08 |
| `--color-danger-text` on `--color-danger-bg`    | 9.21  | 11.24 |
| `--color-warning-text` on `--color-surface`     | 7.48  | 11.80 |
| `--color-text` on `--color-warning-bg`          | 15.44 | 11.38 |
| `--color-inverse-text` on `--color-inverse-bg`  | 14.68 | 14.72 |
| `--badge-high-text` on `--badge-high-bg`        | 7.60  | 10.00 |
| `--badge-medium-text` on `--badge-medium-bg`    | 7.52  | 8.92  |
| `--badge-low-text` on `--badge-low-bg`          | 8.62  | 9.22  |

| Non-text pair (must be ≥ 3)                        | Light | Dark |
| -------------------------------------------------- | ----- | ---- |
| `--color-focus` on `--color-surface`               | 6.70  | 8.02 |
| `--color-focus` on `--color-bg`                    | 6.20  | 8.85 |
| `--color-focus-on-inverse` on `--color-inverse-bg` | 8.14  | 5.56 |
| `--color-border-strong` on `--color-surface`       | 4.66  | 5.46 |
| `--color-danger` on `--color-danger-bg`            | 5.75  | 7.85 |

The same test file also fails if any CSS file other than `tokens.css` has a raw colour (hex,
`rgb()`, `hsl()` …), if a `var(--x)` is not defined, if an `outline: none` appears, if the
reduced-motion block is missing, or if `.dialog-title`, `.task-title` or `.page-title` lose
`overflow-wrap: anywhere`.

### axe-core (4.14.0, exact) — zero violations

`src/App.a11y.test.tsx` runs axe on the whole page in seven states: the list page (with an overdue,
a done and an Urdu task), the task page, the task page with the edit form open, Page not found, the
error state (server off), the empty state and the open delete dialog. **Zero violations** in all
seven, on the first run, so there was nothing to fix. Because a checker that finds nothing proves
little, an eighth test renders a button with no name and checks that axe reports `button-name`.
`color-contrast` is switched off in these tests only: jsdom applies no CSS, so axe cannot measure
it. Contrast is covered by the token test above.

### Checked in a real browser (headless Edge, production build + json-server)

A small script drove Edge over the DevTools protocol. At every width it measured the page, the
long-title task's page and its open delete dialog:

| Width                    | Page wider than screen | Elements past the edge | Targets under 44 px | Dialog inside the screen, title not cut |
| ------------------------ | ---------------------- | ---------------------- | ------------------- | --------------------------------------- |
| 320, 375                 | no                     | 0                      | 0                   | yes (16 px from each edge)              |
| 640, 720 (= 200% zoom\*) | no                     | 0                      | 0                   | yes                                     |
| 768, 1024, 1440          | no                     | 0                      | 0                   | yes                                     |

\* 200% zoom on a 1280 px or 1440 px window lays the page out at 640 or 720 CSS px, and all
breakpoints are in rem, so these two widths are what a zoomed laptop shows.

In the same run the dialog was a real modal (`:modal`), focus started on Cancel, Escape closed it
and focus came back to Delete. With reduced motion the button transition was `1e-05s` and scrolling
`auto` (without it: `0.12s` and `smooth`). The focus ring after Tab was a 3px solid outline in the
dark theme's focus colour. I looked at the screenshots at 320, 375 (light and dark), 768 and 1440 px.

### Two data sources, one interface

| Source              | File                    | Used when                                  | Where the data lives                       |
| ------------------- | ----------------------- | ------------------------------------------ | ------------------------------------------ |
| json-server (`api`) | `src/api/tasks.ts`      | local work (`npm.cmd run start:all`)       | `db.json` on your PC                       |
| browser (`local`)   | `src/api/localTasks.ts` | `VITE_DATA_SOURCE=local`: the Vercel build | `localStorage` key `task-tracker:tasks:v1` |

Both give `getTasks`, `createTask`, `updateTask` and `deleteTask` with the same results and the same
errors (a missing task is "This task no longer exists" in both). `src/api/index.ts` picks one from
`VITE_DATA_SOURCE` (anything but `local` means json-server) and `useTasks` only sees the shared
`TasksSource` type. **Why:** Vercel hosts static files only, so json-server cannot run there, but
the demo must still save and survive a reload; for local work json-server stays, because it
behaves like a real server (slow, off, 404, 500), which is what Day 13 was about.

What the browser source does with **untrusted storage** (anyone can edit `localStorage` in DevTools):

- **First visit** (nothing saved): the 8 sample tasks from `db.seed.json`, with due dates built from
  the **local** today (`addDays` on local date parts, never `toISOString`).
- **Bad items** (wrong types, no id, a repeated id): skipped, with the same "N items … were skipped"
  line as with json-server.
- **The whole value is broken** (not JSON, or not a list): it is copied to
  `task-tracker:tasks:v1:backup`, the samples are put back, and a message says so.
- **Storage blocked** (private mode, site data turned off; even reading `window.localStorage` can
  throw) **or full** (`QuotaExceededError`): the app keeps working in memory and shows "Changes
  can't be saved in this browser (storage is blocked or full). They stay until you close or reload
  this tab."
- **Two tabs**: every change reads the saved list fresh before writing, so another tab's task is not
  overwritten, and the `storage` event reloads the list in the other tab ("The list was updated in
  another tab" is announced).
- **Reset demo data** (only in browser mode, at the bottom of the list): the same `<dialog>` as
  Delete, "Reset the demo data?" [Cancel] [Reset]. json-server has `npm run db:reset` instead.

### Choices I made, and why

| Choice                                               | Why                                                                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A dialog AND the Undo bar**                        | The dialog stops a slip of the finger (Delete sits next to Edit on a phone). Undo still covers "I meant it, but changed my mind". Day 12 had only Undo.        |
| **Native `<dialog>` + `showModal()`**                | The browser traps focus, makes the page behind inert, handles Escape and draws `::backdrop`. A home-made modal would have to rebuild all of that.              |
| **Focus starts on Cancel**                           | Enter or Space right after opening must never delete. Cancel is also first in the DOM, so the tab order matches the screen.                                    |
| **The parent renders the dialog only while it asks** | It always opens fresh, with focus on Cancel, and closing it is just "stop rendering it". The cleanup calls `close()`.                                          |
| **First answer wins** (a ref in the dialog)          | A double click on Delete, or Escape right after it, cannot answer twice. The one-request-per-task guard from Day 13 is a second safety net.                    |
| **`<bdi>` around the title** in the question         | An Urdu title is right-to-left inside an English sentence; `<bdi>` keeps the quotes and the "?" in the right place.                                            |
| **Tokens with the same names in both themes**        | Components never ask "dark or light?"; the media query swaps the values. Adding a theme switch later only needs a class that sets the same variables.          |
| **rem breakpoints (40rem, 64rem)**                   | They follow the text size and zoom: at 200% zoom a laptop gets the phone layout, which is what fits.                                                           |
| **`aria-disabled` look in CSS**                      | From Day 13: busy controls keep focus, so the "disabled" look (opacity 0.55, not-allowed cursor) comes from CSS, for both `aria-disabled` and real `disabled`. |
| **The inline "Show all" / "Clear filters" links**    | Vertical padding makes them 44 px tall without changing how the sentence looks.                                                                                |

**Known limits (Day 15)**

- Browser storage belongs to one browser on one device: the phone and the laptop each have their own
  tasks. That is fine for a demo, not for real use.
- Two tabs that change the same task within the same moment: the last write wins (no version check),
  as with json-server.

- jsdom has no `showModal()`. The tests use a small stand-in (`src/test/setup.ts`) that only sets
  `open` and fires `close`. Focus trapping and the inert page behind the dialog come from the
  browser and were checked in Edge, not in the unit tests.
- The theme follows the system setting only; there is no switch in the app yet.
- Contrast is checked on token pairs, not on every rendered element. A new pair (a new colour on a
  new background) must be added to the list in `styles.test.ts`.

## Day 14: filters, a task page and a `useTasks` hook (React Router)

### What works now

- **Part A.** All task logic moved from `App` into `useTasks`; `TasksProvider` shares it. React
  Router (8.5.1, exact version) gives three routes (table above). Each task title is a real link,
  so "open in a new tab" works. The task page shows the task, edits it, ticks it and deletes it.
  Every page sets the tab title and, after an in-app navigation, moves focus to its `<h1>`.
- **Part B. Filters.** Status **All / Pending / Done** with counts (replaces "Hide done tasks"),
  **Filter by priority** Any / High / Medium / Low, and **Search by title**. They combine (AND).
  "Showing 2 of 8 tasks" above the list. No match: "No tasks match these filters." +
  **Clear filters** (focus goes to the search box).
- **In the URL:** `?status=done&priority=high&q=milk`. Status and priority push a history entry
  (Back undoes them); typing in the search **replaces** it (no entry per letter).
- **Never a silent disappearance:** if the task you just added, ticked, unticked or brought back
  with Undo is hidden by the filters, the page says "Task added, but hidden by your filters.
  [Show all]" (also read by screen readers). Show all clears the filters and focuses the task.
- **"Back to tasks"** (and Delete or a 404 on the task page) returns to the list **with the same
  filters**.

### Choices I made, and why

- **The URL is the only copy of the filters.** No `useState` mirror and no `useEffect` to sync
  them: `readFilters(searchParams)` runs on every render, and `filterTasks` too. A copy in state
  could disagree with the address bar after Back/Forward.
- **The URL is untrusted** (typed, edited, shared). `readFilters` accepts any case (`DONE`),
  turns unknown values into the default, uses the **first** of a repeated param, and cuts `q` to
  100 characters without splitting an emoji. History state (`listSearch`) goes through the same
  reader, because any page can put something there.
- **Plain-text search, no RegExp.** `"c++"`, `"("` and `".*"` are searched as typed. The text is
  NFKC-normalised, trimmed, runs of spaces collapsed and lower-cased on both sides, so Urdu works
  too. The search box has `dir="auto"`.
- **Counts on the status buttons are over all tasks**, like the summary. Counting only the
  filtered list would make "Done (0)" under "Pending", which says nothing.
- **Fixed button labels + `aria-pressed`** for the status buttons (the old toggle changed its own
  label, which I said I would look at again).
- **"Filter by priority", not "Priority".** The add form already has a select called "Priority".
- **Edit is a link**, not a button: it opens `/tasks/:id` with `state: { edit: true }`, so the
  form is open. It is a real URL; opening it in a new tab shows the task without the form
  (history state does not travel to a new tab), which is safe.
- **The scroll helper (`utils/scroll.ts`) is removed.** It scrolled the side panel into view on
  phones. The panel is gone: the task has its own page and focus goes to its `<h1>`.
- **No transitions in the router** (`useTransitions={false}`): the search box is controlled by the
  URL and must update with every key press.

### Edge cases (Day 14, from the user's side; all tested)

| Case                                                             | What happens                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `?status=DONE`, `?status=finished`, `?priority=`                 | Done; All; Any. Never a crash or an empty page without a reason.                                         |
| `?status=pending&status=done`                                    | Pending (the first one).                                                                                 |
| `?q=` with 150 characters                                        | Cut to 100.                                                                                              |
| Search ` BUY   milk`, `c++`, `(`, `دودھ`                         | Finds "Buy milk", "Learn C++ (basics)", the Urdu task. No RegExp error.                                  |
| Search of only spaces                                            | Matches everything and is left out of the URL.                                                           |
| Nothing matches                                                  | "Showing 0 of 8 tasks", "No tasks match these filters." + Clear filters → `/`, focus in the search.      |
| Add / tick / untick / Undo a task the filters hide               | "…, but hidden by your filters. [Show all]". A ticked row's focus moves to its neighbour or the heading. |
| Change the filters after that message                            | The message goes away (it was about the old filters).                                                    |
| Typing in the search, then Back                                  | One Back skips the whole word (replace), not one letter at a time.                                       |
| Open a task from a filtered list, then "Back to tasks"           | Same filters. From Edit too.                                                                             |
| **Part A:** `/tasks/unknown`, `/tasks/a/`, `/tasks/with%20space` | "Task not found"; the task; the task.                                                                    |
| **Part A:** open a task page while the list is loading           | "Loading task…", never "Task not found" first.                                                           |
| **Part A:** load error on a task page                            | The message + Try again, which loads the task.                                                           |
| **Part A:** a 404 (deleted in another tab) on the task page      | Back to the list with the message; Back does not return to the dead page.                                |
| **Part A:** unsaved edit + "Back to tasks"                       | "You have unsaved changes [Save] [Discard]" instead of leaving.                                          |
| **Part A:** a title over 50 characters                           | Cut with "…" in the tab title; the `<h1>` keeps it whole.                                                |
| **Part A:** `/nope`                                              | "Page not found" + a link home.                                                                          |
| **Part A:** `useTasksContext()` outside the provider             | A clear error that says so.                                                                              |

Limits I know about: the unsaved-changes bar guards in-app links only, not the browser's Back
button or closing the tab. Two tabs do not sync live; a change from another tab shows up on a
reload, or as a 404 message when you touch a task the other tab deleted (Day 13).

## Demo script (2 minutes, on a phone)

Open the live link on the phone (the first visit stores the 8 sample tasks in that browser).

1. **The look**: cards with a coloured edge, "Priority: High" and "Overdue (was due …)" badges in
   words, full-width Edit / Delete buttons. Turn on the phone's dark mode: the app follows it.
2. **Filters**: tap **Pending**: the list shrinks and the address bar shows `/?status=pending`.
3. **Delete**: tap Delete on a task: the dialog asks "Delete “…”?". Tap the dark area: nothing
   changes. Tap Delete again, then **Delete** in the dialog: gone, and the **Undo** bar shows; tap
   Undo: it is back in the same place.
4. **Add**: type a title with an emoji 🛒 and tap **Add task**.
5. **Open a task**: tap its title. Tick "Mark as done". **Reload the page**: it is still done (it
   is saved in this browser), and the address `/tasks/…` still works.
6. **Share the link** of a filtered list (`/?status=done`) and open it in a new tab: same view.
7. **Turn the phone sideways**: the layout widens, no sideways scrolling.
8. **Reset demo data** (at the bottom of the list): the same dialog; Reset brings back the 8
   sample tasks.

## Day 13: the tracker reads from a mock API (json-server)

> The Day 11–13 sections describe the app as it was on those days. Since Day 14 the state lives in
> `useTasks`, the side panel is the `/tasks/:id` page and "Hide done tasks" is the status filter.

### What works now

- The tasks live in **`db.json`**, served by **json-server** on `http://localhost:3001`. Every add,
  edit, tick and delete is saved there, so a **reload keeps the changes**.
- Loading has three states: **Loading** ("Loading tasks…", the tasks panel has `aria-busy="true"`),
  **Error** (the message + a "Try again" button) and **Ready** (the list; an empty list shows the
  existing "No tasks yet" state). The add form only appears once the list is loaded.
- **Add and edit wait for the server**: the button shows "Saving…" and is disabled. If the save
  fails, the error is shown under the form and **everything typed stays**.
- **Done and delete are optimistic**: the screen changes at once, then the request goes out. If it
  fails, the old state comes back with a message ("Couldn't delete. The task is back. ...").
- **Undo** after a delete creates the task again on the server **with the same id**.
- The header says "Saved on the local mock server (json-server)".
- Every success and every error is read out by the live region. Add and edit errors stay under the
  form; errors from ticking, deleting, Undo and a 404 stay in a box above the list until "Dismiss"
  or the next action.

### How the data flows

```
page (App)  →  src/api/tasks.ts  →  fetch  →  json-server :3001  →  db.json
     ↑                 │
     └── clean Task objects, or an ApiError with a friendly message
```

- `src/api/tasks.ts` is the **only** file that calls `fetch`. Components call `getTasks`,
  `createTask`, `updateTask` and `deleteTask` and never see a raw `Response`.
- Every request has an **8 s timeout**, combined with the caller's `AbortSignal` in one
  `AbortController` (a `setTimeout`, so the tests can use fake timers).
- `response.ok` is checked first. On an error status the unread body is cancelled
  (`response.body?.cancel()`), so the connection is freed. The body is read as text and parsed as JSON; if that fails, the
  user sees "The server sent data the app can't read." instead of a crash.
- The body is `unknown` until a **type guard** (`isTask`) says it is a task. No `as` casts. In the
  list, bad items (wrong types, no id, empty title, an id used twice) are **skipped** and counted,
  and the page shows one small line: "2 items in the saved data could not be read and were
  skipped." Extra fields in `db.json` are dropped.
- The URL comes from `VITE_API_URL` (see `.env.example`), default `http://localhost:3001`.

| Function                        | Request                   | Success                      | Extra errors (besides server off, timeout, 5xx, not JSON) |
| ------------------------------- | ------------------------- | ---------------------------- | --------------------------------------------------------- |
| `getTasks(signal)`              | `GET /tasks`              | `{ tasks, skipped }`         | the body is not a list                                    |
| `createTask(task)`              | `POST /tasks` (with `id`) | the saved task               | an id that already exists (json-server answers 500)       |
| `updateTask(id, changedFields)` | `PATCH /tasks/:id`        | the updated task             | 404 → "This task no longer exists"                        |
| `deleteTask(id)`                | `DELETE /tasks/:id`       | nothing (`{}` or empty body) | 404 → "This task no longer exists"                        |

The messages: server off → "Can't reach the server. Is it running? (npm run api)", 8 s → "The server
is taking too long", 5xx → "The server had a problem. Try again.", any other 4xx → "The server refused
the request." A raw error text (like `TypeError: Failed to fetch`) is never shown.

### When I'd avoid useEffect

An effect is for **keeping in sync with something outside React**. In this app there are two:

1. **Loading the tasks** when the page appears (and again on "Try again"). The effect starts the
   request with an `AbortController` and its cleanup aborts it. That covers unmount, a new "Try
   again", and StrictMode, which runs the effect twice in development: the first request is
   aborted, its `AbortError` is ignored, and only the second answer is used. No flicker, no error.
2. **Moving focus** after React has put the element on the page (from Day 12).

Where I avoid it:

| Situation in this app                                       | What I do instead                                                                     | Why not an effect                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The visible list (filter + sort), "3 of 8 done", "N hidden" | computed during render: `getVisibleTasks(tasks, hideDone)`, `countDone(tasks)`        | `useEffect` + `setState` renders twice, and the copy is out of date for one render                              |
| `selectedTask`, `editingTask`                               | looked up by id during render                                                         | a stored copy goes stale when the task changes                                                                  |
| Saving (add, edit, done, delete, Undo)                      | inside the **event handler**, right after the click                                   | the click is the cause; "state changed → effect sends a request" can fire again on re-renders and in StrictMode |
| Showing another task in the edit form                       | `key={task.id}` on the form                                                           | an effect that copies props into state is one render late                                                       |
| "Try again"                                                 | the handler sets "loading" and adds 1 to `loadAttempt`; the load effect depends on it | no extra effect that "watches" the error                                                                        |

### Choices I made, and why

| Choice                                               | Why                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add and edit wait** for the server                 | The user typed something; it must not look saved when it is not. On failure the form keeps the text, so nothing has to be typed again. A new task also has to exist on the server before it can be ticked or deleted.                                                                                                               |
| **Done and delete are optimistic**                   | One click, an instant result, and both are easy to put back exactly (the old `done` value; the task at its old index). A failure rolls back and says so.                                                                                                                                                                            |
| **One request at a time per task**                   | While a task's request runs, its checkbox, Edit and Delete are disabled (`busyIds`). A quick double "done" would otherwise send `done: true` and `done: false` at the same time, and whichever arrives last wins, so the server could end up different from the screen. A ref blocks the second click even before React re-renders. |
| `aria-disabled`, not `disabled`, on the row controls | A real `disabled` drops keyboard focus to `<body>` the moment the request starts. With `aria-disabled` focus stays, screen readers hear "dimmed", and App ignores the click. The form's submit button uses real `disabled` (focus moves on after the save anyway).                                                                  |
| **Undo = create again with the same id**             | json-server has no "undelete". The app makes the ids itself (`makeId()`), so the task comes back with the same id and fields. Undo waits until the DELETE has finished, otherwise the POST could arrive first and fail with "duplicate id". If the POST fails, the message says so and the Undo bar comes back.                     |
| **PATCH only the changed fields**                    | Sending the old object would overwrite a change made in the meantime (e.g. "done" ticked while the form was open, or in another tab). An edit without changes sends nothing.                                                                                                                                                        |
| **404 = the task is gone**                           | Deleted in another tab: the app removes it from the list, closes its detail or edit form and says "This task no longer exists. It was removed from the list."                                                                                                                                                                       |
| **json-server 0.17.4, exact versions**               | 0.17 is the stable line. **json-server v1 is still a beta** (a different CLI and behaviour), so I did not use it for a hand-in. `json-server` and `concurrently` are pinned without `^`, so `npm ci` installs exactly what I tested.                                                                                                |
| **The seed has `dueInDays`, not dates**              | `db.seed.json` stores "-1 / 0 / 1 / 7 / null days from today". `npm run db:reset` builds `db.json` with dates from the **local** today (`getFullYear`/`getMonth`/`getDate`, never `toISOString`), so the demo always has one overdue and one due-today task.                                                                        |

### Edge cases from the user's side (Day 13)

| Edge case                                   | What happens                                                                                                                 | Test file          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Server off at start                         | "Can't reach the server. Is it running? (npm run api)" + Try again. Never a blank page                                       | App.load, api      |
| Server stops while using the app            | The list stays. The next save fails with the same message; a tick or delete rolls back                                       | App.load, App.save |
| Slow server                                 | After 8 s: "The server is taking too long" (load and every save)                                                             | App.load, api      |
| Try again                                   | Works any number of times. The button is gone while loading, so a double click sends one request; an older answer is ignored | App.load           |
| Double click on Add / Save                  | "Saving…", the button is disabled: ONE request                                                                               | App.save           |
| Double click on "done"                      | ONE request. The checkbox is disabled until it ends, so requests never overlap and the server matches the screen             | App.save           |
| A failed add / edit                         | The error under the form, the typed text kept, trying again works                                                            | App.save           |
| A failed done / delete                      | Rolled back + "Couldn't save the change. The task is back as it was." / "Couldn't delete. The task is back."                 | App.save           |
| Undo after delete                           | POST with the same id, after the DELETE has finished. If it fails: "Couldn't restore the task." and Undo is offered again    | App.save           |
| 404 from another tab (edit / done / delete) | "This task no longer exists. It was removed from the list.", detail and edit form closed                                     | App.save           |
| Bad data in `db.json`                       | Bad items skipped + one small warning. Not a list, or not JSON → an error message with Try again                             | App.load, api      |
| Reload                                      | Keeps every change (they are in `db.json`)                                                                                   | App.load           |
| Unmount while loading                       | The request is aborted; its answer never touches the page                                                                    | App.load           |
| Port 3001 busy                              | `npm run api` stops with `EADDRINUSE`. See "How to run" for what to do                                                       | checked by hand    |
| All Day 11 and Day 12 edge cases            | Still pass: the old App tests now run against the fake server                                                                | all App tests      |

**Known limits (Day 13)**

- Two tabs do not update each other live. A change from another tab shows after a reload, or as a
  404 when you act on a task the other tab deleted. If both tabs edit the **same field** of a task,
  the last save wins (there is no version check).
- Undo is on screen for 5 seconds. Leaving the page in that time keeps the task deleted.
- A long title or description typed straight into `db.json` is still shown; the edit form then asks
  to shorten it before saving (the same 100 / 500 limits).

## Day 12: add, edit, delete and mark done (in memory)

### What works now

- **Add**: the form at the bottom works. Title (required), description, priority (default
  "Medium") and an optional due date, all **controlled inputs**. Enter in the title submits. After a
  save the form clears, focus goes back to the title, and screen readers hear "Task added".
- **Edit**: "Edit" on a row opens the task in the **same** `TaskForm`, in the detail panel,
  prefilled. Save or Cancel (or Escape). Only one task is edited at a time.
- **Delete**: "Delete" on a row removes the task at once, and an Undo bar shows
  "Task deleted. [Undo]" for 5 seconds.
- **Mark done**: a checkbox on every row ("Mark <title> as done"). The summary ("3 of 8 done")
  updates live.
- On Day 12 everything was **in memory** (a refresh brought back the sample tasks). Since Day 13 it
  is saved on json-server: see the Day 13 section.

### Choices I made, and why

| Choice                                                      | Why                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicate titles are allowed**, with a warning            | Two real tasks can have the same name ("Call mum" every week). Blocking would annoy people; the warning ("A task with this title already exists") catches a real double entry. The check trims and ignores case. The task being edited is never a duplicate of itself.                                                                                  |
| **Past due dates are allowed**, with a warning              | People log work they forgot to add, or copy an old task. The warning ("This date is in the past") catches a typo in the year. The task then simply shows as "Overdue".                                                                                                                                                                                  |
| **Undo instead of a confirm dialog**                        | `window.confirm()` blocks the whole page, cannot be styled, and people click "OK" without reading. Deleting at once and offering Undo is faster for the normal case and still safe for the mistake.                                                                                                                                                     |
| **No `maxLength` on the inputs**                            | `maxLength` silently cuts pasted text: paste 150 characters and the last 50 are gone without a word. Instead the text stays, the counter turns red ("150/100"), an error says "Title must be 100 characters or less", and saving is blocked until the user shortens it.                                                                                 |
| **Characters are counted with `[...text].length`**          | `"🛒".length` is 2 in JavaScript (two UTF-16 units). `[..."🛒"].length` is 1, which is what a person counts. The counter shows the **trimmed** length, the same number the validation uses.                                                                                                                                                             |
| **"Title is required" appears only after a submit attempt** | An empty new form with a red error before the user typed anything is unfriendly. Length and date errors appear as soon as they are true.                                                                                                                                                                                                                |
| **Saving an edit changes only the 4 edited fields**         | `updateTask` copies title, description, priority and due date onto the task **as it is now in state**. It never writes back a copy taken when editing started, so ticking the task done while its form is open is not undone by Save (the "lost update" bug). Since Day 13 the same idea is a PATCH with only the changed fields, merged by the server. |
| **Unsaved changes: an inline bar, not `window.confirm`**    | Same reasons as Undo. The bar keeps the draft on screen, and its Save runs the normal form validation (`form.requestSubmit()`), so an invalid draft cannot be saved from the bar either.                                                                                                                                                                |
| **Undo puts the task back at its old index**                | The list on screen is sorted, so the user sees it in the same place. If the array is now shorter than the old index, it goes at the end.                                                                                                                                                                                                                |
| **`makeId()` wraps `crypto.randomUUID()`**                  | Tests pass a fake `makeId` to App and get `new-1`, `new-2`. `randomUUID` only exists on https or localhost, so opening the dev server from a phone on the local network would crash; `makeId` has a simple fallback for that case.                                                                                                                      |
| **Focus is moved on purpose**                               | After add: the title box. After save: the task. After cancel/Escape: its Edit button. After delete (or a done task being hidden): the next task, else the previous one, else the "Tasks" heading. Focus is never left on a button that has just disappeared.                                                                                            |

### Edge cases from the user's side (all of them work and are tested)

| Edge case                               | What happens                                                                                                                                    | Test file                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Empty or spaces-only title              | "Title is required" next to the field (`aria-describedby`), `aria-invalid="true"`, focus on the field, nothing added                            | TaskForm, App.add, App.edit     |
| Trimmed values                          | `"  Buy milk  "` is stored as `"Buy milk"`. A description of only spaces is stored as `""` and shows "No description"                           | TaskForm, App.add, tasks        |
| 100 / 500 limits with counters          | Live "98/100" counter, linked to the field. 100 is allowed, 101 is blocked. An emoji counts as 1                                                | TaskForm, tasks                 |
| Pasted long text                        | Not cut. Counter red ("150/100"), error message, Save blocked, focus on the field                                                               | TaskForm                        |
| Invalid date                            | Only a real `YYYY-MM-DD` with a 4-digit year: "Enter a valid date" for `20266-11-12`, `2026-02-30`, and a half-typed date (`validity.badInput`) | TaskForm, tasks                 |
| Double click on "Add task"              | Exactly one task, and no false "Title is required"                                                                                              | TaskForm, App.add               |
| Duplicate title                         | Warning, still allowed                                                                                                                          | TaskForm, App.add, tasks        |
| Past due date                           | Warning, still allowed                                                                                                                          | TaskForm, tasks                 |
| Escape cancels an edit                  | Old values kept, focus back on that task's Edit button                                                                                          | TaskForm, App.edit              |
| Unsaved changes bar                     | Selecting or editing another task with a changed draft shows "You have unsaved changes [Save] [Discard]". No `confirm`/`alert`                  | App.edit                        |
| Edit + tick done + Save                 | The task stays done                                                                                                                             | App.done                        |
| Delete + Undo                           | Back in the same position, or at the end if that position is gone. Timer 5 s, paused on hover and on focus, cleared on unmount                  | App.delete, tasks               |
| Deleting the selected / the edited task | Detail panel clears / the edit is cancelled, no crash                                                                                           | App.delete                      |
| Deleting every task                     | "No tasks yet. Add your first task below." comes back                                                                                           | App.delete                      |
| Focus after add / edit / delete         | See "Focus is moved on purpose" above                                                                                                           | App.add, App.edit, App.delete   |
| Live region messages                    | "Task added", "Changes saved", "Task deleted", "Task restored", "Task marked done", "Task marked done (hidden)", "You have unsaved changes"     | App.\* tests                    |
| Hide done + tick a task                 | It disappears, "Task marked done (hidden)", "N done tasks hidden" updates, focus moves to the next task                                         | App.done                        |
| Keyboard only                           | Tab reaches every control, Enter submits/selects, Space ticks, Escape cancels                                                                   | TaskItem, App, TaskForm         |
| Long titles and Urdu text               | `dir="auto"` on titles, descriptions and inputs; long words wrap                                                                                | TaskItem, + browser check below |
| 320 px width                            | No horizontal scroll (browser check below)                                                                                                      | browser check                   |
| Refresh                                 | Day 12: brought back the sample tasks. Since Day 13: keeps every change (saved in `db.json`)                                                    | App.load                        |

**Browser check (Firefox, headless, on Linux Mint).** I loaded the production build into a 320 px wide
frame, opened the edit form on the long-title task, typed 130 characters, deleted a task (Undo bar on
screen) and clicked Edit on another task (unsaved-changes bar on screen). In every state the page
`scrollWidth` stayed equal to its width and **0 elements** went past the right edge. The Edit and
Delete buttons wrap under the task on narrow screens. Keyboard use was tested with Testing Library's
keyboard simulation, not by hand in a browser.

**Known limits (honest list, Day 12)**

- The Undo bar sits just above the list. From a task far down the list a keyboard user needs several
  Shift+Tab presses (each row has 4 stops), and the timer only pauses once focus is **in** the bar.
  The live region says "Task deleted" at once, but 5 seconds may still be short. To look at on Day 15.
- Undo brings the task back with its saved values. An unsaved edit draft of a deleted task is gone.
- The duplicate check uses `toLowerCase()` after trimming. It does not treat "é" and "é" (two
  Unicode spellings of the same letter) as equal.

## Why keys matter

**A key is the item's ID card. The index is only its seat number.**

When a list re-renders, React matches the old rows to the new rows **by key**. Whatever belongs to a
row (its DOM elements, the focus, the text typed in its inputs, its `useState`) stays with the row
that has the same key.

With `key={index}` the seat numbers are the identity. Delete the item in seat 0 and every item below
moves up one seat: React thinks item "0" still exists (it is B now) and that the **last** seat was
removed. So A's state is given to B:

```
Before: seat 0 = A (note typed: "call at 5")     seat 1 = B (no note)
Delete A
key={index}:  seat 0 = B  ← React keeps seat 0's old state → B now shows "call at 5"  ✗
key={id}:     "b" = B     ← React drops the row with key "a" and its state       → B has no note ✓
```

In this app:

- Every list uses `key={task.id}` (an id made once by `makeId()`), never the index.
- The edit form uses `key={task.id}` too. Switching from editing A to editing B gives a **fresh**
  form with B's values. With one fixed key, React would keep the old form and A's values would stay.
- The Undo bar uses `key={deleted task id}`, so a second delete gets a fresh 5-second timer.

Tests in `src/keys.test.tsx`:

1. Start editing B, delete A (above it): the edit form still shows B's values and the unsaved draft,
   and Save updates B.
2. A tiny list whose rows have their own state, with `key={index}`: deleting the first row moves its
   note onto the next row (the bug, shown on purpose).
3. The same list with `key={id}`: the note leaves with its own row.

## Day 11 edge cases (developer side)

- **Empty list**: 0 tasks shows "No tasks yet" in the summary and "No tasks yet. Add your first task
  below." where the list would be. No empty `<ul>` is rendered.
- **Everything hidden**: a clear message plus the "Show them" button.
- **Stale selection**: `selectedTask` is looked up in the _visible_ list, so hiding the selected task
  shows "Select a task to see its details" instead of an old task. `selectedId` itself is kept, so
  showing done tasks again brings the selection back. This is a deliberate choice.
- **Keys**: `key={task.id}`, never the index, because the order changes when sorting and filtering.
- **Long titles without spaces** wrap with `overflow-wrap: anywhere`. Grid children have
  `min-width: 0` so long text cannot push the page wider.
- **Dates**: `"2026-11-12"` is split into year, month and day. It is never passed to
  `new Date("2026-11-12")`, which parses as UTC and can show the previous day. Invalid dates such as
  `2026-02-30` show "Unknown date (...)" instead of crashing.
- **Today**: built from the local date parts (`getFullYear`, `getMonth`, `getDate`), not from
  `toISOString()`, which gives the UTC date.
- **Strict TypeScript**: `strict` and `noUncheckedIndexedAccess` are on. The linter blocks `any`,
  non-null `!` and `as` type assertions.
- **Sample data test** (since Day 13 it checks `db.seed.json`): ids are unique, titles are not
  empty, dates are valid, and every edge case above is present in the data.

## Day 11 edge cases (from the user's side)

- Browser tab title is "Task Tracker" with a simple tick favicon (the Vite logo is gone).
- Correct plurals: "1 task" / "2 tasks", "1 done task hidden" / "2 done tasks hidden", "1 of 1 done".
- Sort order: not-done first, then by due date (no date last), then by title.
- Dates read like "12 Nov 2026".
- "Overdue (was due 5 Nov 2026)" and "Due today" are compared with the user's **local** date.
  Done tasks are never shown as overdue.
- Status, priority and due state are written as **text** ("Not done", "Priority: High", "Overdue").
  Colour is only an extra hint, for screen reader and colour-blind users.
- Titles and descriptions use `dir="auto"`, so the Urdu task reads right-to-left. Descriptions keep
  their line breaks (`white-space: pre-line`).
- The selected task has a background, a border and an outline, so it is not shown by colour alone.
  It also has `aria-pressed="true"`.
- On narrow screens (below 48rem) the detail panel is under the list, so selecting a task scrolls it
  into view. The scroll is smooth only if the user has not turned on "reduce motion".
- "Hide done tasks" shows "N done tasks hidden" with a "Show them" button. The line above the list is
  a live region (`role="status"`), so screen readers hear "Showing 5 tasks" when it changes.
- Keyboard: every task row is made of real controls (checkbox + buttons), so Tab reaches them and
  Enter/Space use them. Every control has a visible focus ring (`:focus-visible`).
- Form: every input has a `<label>`, and Enter does not reload the page (`onSubmit` +
  `preventDefault`). Day 12 removed the disabled button and its "next update" note.
- Layout: rem units and a single column below 48rem. Checked in a real browser (Edge) with the
  layout squeezed to 246 CSS px: no element went past the edge of the screen.

**Known limits** (honest list):

- The date is read **once, on page load**. If the page stays open past midnight, "Due today" and
  "Overdue" still use yesterday's date: refresh the page to update them.
- The toggle changes both its label and `aria-pressed`, as the brief asked. Some screen reader guides
  prefer a fixed label with only `aria-pressed` changing. (Day 14: the toggle is gone; the status
  buttons have fixed labels and only `aria-pressed` changes.)

## Tests

**392 tests in 28 files** (Day 14 had 276 in 22), run with Vitest + React Testing Library + jsdom.
No test calls a real server: the network is replaced with `vi.spyOn(globalThis, 'fetch')`, either
directly or through `src/test/fakeServer.ts`, a small in-memory json-server (same 404 and
duplicate-id 500 answers as the real one) that can also fail, hang or hold a request. Since Day 14
the App renders inside a `MemoryRouter` (`renderApp(tasks, { route: '/?status=done' })`).

| File                                          | Tests | What it checks                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/styles.test.ts`                   | 57    | **Day 15.** every CSS file found and read; no raw colours outside tokens.css; every `var()` defined; focus ring never removed; reduced motion; long titles wrap; 25 contrast pairs × 2 themes; the contrast formula itself                                                                    |
| `src/utils/tasks.test.ts`                     | 33    | sorting, summary and "Showing X of Y" texts, addTask, updateTask, deleteTask, restoreTask, setDone (frozen arrays), validateTask, countChars, makeId                                                                                                                                          |
| `src/api/tasks.test.ts`                       | 26    | every API function: ok, 404, 500 (body cancelled), server off, 8 s timeout, non-JSON, bad items skipped, duplicate ids, PATCH body, caller abort                                                                                                                                              |
| `src/components/TaskForm.test.tsx`            | 24    | labels, trimming, required title, counters, emoji, 100/500 limits, invalid and half-typed dates, warnings, double click, edit mode, Escape                                                                                                                                                    |
| `src/App.save.test.tsx`                       | 20    | "Saving…", failed add/edit keep the text, PATCH only changed fields, optimistic done/delete + rollback, Undo with the same id, 404, double clicks                                                                                                                                             |
| `src/utils/filters.test.ts`                   | 20    | **Day 14.** URL reading (case, unknown, empty, repeats, 100 chars, emoji not split), writing (defaults left out), round trip, spaces/case/Urdu, `c++` `(` `.*` `[` as plain text, counts                                                                                                      |
| `src/App.routes.test.tsx`                     | 19    | **Day 14.** the three routes, tab titles, `<h1>` focus, loading vs not found, load error, odd ids, trailing slash, done/delete/404 on the task page                                                                                                                                           |
| `src/utils/dates.test.ts`                     | 17    | formatting, null, invalid dates, leap years, local today, addDays, overdue / today with a fake today                                                                                                                                                                                          |
| `src/App.filters.test.tsx`                    | 15    | **Day 14.** counts + aria-pressed, priority, search, Urdu, push vs replace history, bad URL, Clear filters focus, every hidden-by-filter message, Show all, Back to tasks                                                                                                                     |
| `scripts/seed.test.mjs`                       | 14    | the seed: 6 to 8 tasks, unique ids, valid dates, edge cases present, local date, broken seed                                                                                                                                                                                                  |
| `src/App.edit.test.tsx`                       | 14    | the task page's form: prefilled, focus, Save, Escape/Cancel, empty title blocked, unsaved-changes bar on in-app links, no `window.confirm`                                                                                                                                                    |
| `src/App.load.test.tsx`                       | 14    | loading → ready, error → Try again, empty list, StrictMode double effect, abort on unmount, timeout, non-JSON, bad items warning                                                                                                                                                              |
| `src/api/localTasks.test.ts`                  | 26    | **Day 15.** browser storage: samples with local dates (month end), CRUD under one key, missing id, duplicate id, another tab's task kept, bad items, broken value → backup + samples, blocked, SecurityError, quota, storage event, reset, abort; choosing the source from `VITE_DATA_SOURCE` |
| `src/App.local.test.tsx`                      | 10    | **Day 15.** the App on browser storage: header note, first visit, changes saved, damaged storage, bad items, blocked, full, another tab; Reset demo data (only in local mode, Cancel/Escape, Reset + Undo cleared)                                                                            |
| `src/App.dialog.test.tsx`                     | 11    | **Day 15.** the delete dialog: opens with the title and focus on Cancel; Cancel, Escape and backdrop change nothing and return focus; confirm keeps Undo; double click deletes once; busy task; long and Urdu titles; the task page                                                           |
| `src/App.a11y.test.tsx`                       | 8     | **Day 15.** axe-core on 7 page states (zero violations) + a control test that axe does report a nameless button                                                                                                                                                                               |
| `src/components/ConfirmDeleteDialog.test.tsx` | 4     | **Day 15.** showModal + Cancel first; first answer wins; the browser's "cancel" event; closed when removed                                                                                                                                                                                    |
| `src/components/TaskItem.test.tsx`            | 13    | text status/priority, overdue, due today, link + Edit link, dir, Edit/Delete/checkbox names, row layout                                                                                                                                                                                       |
| `src/App.delete.test.tsx`                     | 12    | delete + announce, focus next/previous/heading, Undo position, 5 s timer, pause on hover and focus, latest only, Delete on the task page, no timer leak                                                                                                                                       |
| `src/App.add.test.tsx`                        | 7     | add + trim + focus + announce, Enter, spaces-only title, double click, empty state goes away, duplicate allowed, header note                                                                                                                                                                  |
| `src/App.done.test.tsx`                       | 6     | summary live, Space, sort after tick, ticked under "Pending" leaves with a message + focus, last one → heading, lost update                                                                                                                                                                   |
| `src/utils/pageTitle.test.ts`                 | 5     | **Day 14.** "Tasks", task titles, the 50-character cut with "…"                                                                                                                                                                                                                               |
| `src/App.test.tsx`                            | 4     | empty list, sort order, each task is a link, keyboard Tab + Enter                                                                                                                                                                                                                             |
| `src/components/TaskSummary.test.tsx`         | 4     | 0 tasks, 1 of 1, some done, all done                                                                                                                                                                                                                                                          |
| `src/components/TaskDetail.test.tsx`          | 3     | "No description" (empty and spaces only), full detail with line breaks                                                                                                                                                                                                                        |
| `src/keys.test.tsx`                           | 2     | the keys demo (see "Why keys matter")                                                                                                                                                                                                                                                         |
| `src/context/TasksContext.test.tsx`           | 2     | **Day 14.** one shared load for all pages; a clear error outside the provider                                                                                                                                                                                                                 |
| `src/utils/plural.test.ts`                    | 2     | 0 / 1 / 2 and a custom plural                                                                                                                                                                                                                                                                 |

Every date test uses a fake today (`2026-11-10`), so the tests never depend on the real date. The
Undo tests use Vitest fake timers (see "What broke").

**Old tests I changed on Day 15** (Delete now asks first; the second data source changed no old test):

- 20 old tests click Delete and now also confirm in the dialog, through one new helper,
  `deleteAndConfirm(user, 'Delete Task B')` in `src/test/renderApp.tsx`. What they check did not
  change: all 12 tests in `App.delete.test.tsx`; in `App.save.test.tsx` "a failed delete puts the
  task back", "Undo re-creates … the SAME id", "Undo waits while the DELETE is still running", "if
  Undo fails it says so" and "404 on delete"; `App.filters.test.tsx` "Undo of a task the filters
  now hide says so"; `App.load.test.tsx` "reload keeps the changes"; `App.routes.test.tsx` "a 404 on
  Delete from the detail page".
- `App.delete.test.tsx`: "deletes without a confirm dialog, shows the Undo bar…" was renamed to
  "deletes after the dialog (never window.confirm), shows the Undo bar…": it still checks that
  `window.confirm` is never called.
- `App.save.test.tsx` "Delete does nothing while saving" still clicks Delete directly: on a busy task
  no dialog opens.
- `src/test/renderApp.tsx`: `waitForLoad()` now also waits until the tab title is no longer
  "Loading…" (see "What broke on Day 15").

**Old tests I changed on Day 14** (the side panel became a page, the toggle became filters):

- `App.test`: "detail panel / deselect", "selection moves", "filter clears the detail" became "each
  task is a link that opens its page"; Tab + Enter now opens the page. The four "Hide done tasks"
  tests (toggle + aria-pressed, "N hidden" + Show them, singular, all hidden) were replaced by
  `App.filters.test.tsx`. The keyboard test presses Tab 5 more times (3 status buttons, the
  priority select, the search box).
- `App.edit.test`: editing moved from the side panel to the task page; the unsaved-changes bar is
  now triggered by in-app links ("Back to tasks"), not by selecting another task. "Only one task
  edited at a time" and "Edit on another task asks" were removed (one page = one task).
- `App.save.test`: edit tests run on `/tasks/:id`; a 404 on save now returns to the list. "Edit and
  Delete do nothing while saving" became "Delete does nothing while saving".
- `App.done.test`: "lost update" now runs on the task page. "Tick the edited task while done tasks
  are hidden" was removed (the filter and the form are on different pages). "Hide done + tick" became
  "with Pending on, a ticked task leaves the list and the message says why"; "hiding the last
  not-done task" became "hiding the last visible task" (focus to the heading, "No tasks match").
- `App.delete.test`: "deleting the selected/edited task clears the panel" became "Delete on the task
  page goes to the list with Undo" and "deleting while editing drops the draft".
- `App.add.test`: checks "No description" on the task page instead of the panel; "Showing 1 task"
  became "Showing 1 of 1 task".
- `utils/tasks.test`: the two `getVisibleTasks` tests moved to `filters.test.ts` (as `filterTasks`);
  `getListStatusText` now checks "Showing X of Y" instead of the all-hidden texts.
- `keys.test`: "edit B, delete A above it" was removed (the list and the form are no longer on the
  same page); the `key={index}` / `key={id}` demo stays.
- `TaskItem.test`: the select button (aria-pressed) is now a link; Edit is a link.
- `TaskDetail.test`: the "Select a task" message was removed; the title is the page `<h1>`.
- `scroll.test` (3 tests) was removed with the scroll helper.

**Old tests I changed on Day 13** (the data now comes from a server):

- All 50 old tests that render the App (`App.test.tsx`, `App.add`, `App.edit`, `App.delete`,
  `App.done` and the first test in `keys.test.tsx`): `renderApp(tasks)` now starts the fake server with those tasks and waits until
  the list has loaded, so every call became `await renderApp(tasks)`. `App.test.tsx` dropped its own
  copy of `renderApp` (it passed `initialTasks`, a prop that no longer exists). What they check did
  not change.
- `App.add.test.tsx`: "says in the header that a refresh brings back the sample tasks" became "says
  in the header where the tasks are saved" (the header text changed).
- `src/data/sampleTasks.test.ts` (15 tests) became `scripts/seed.test.mjs` (14 tests): the same
  checks on `db.seed.json`, 8 "todays" instead of 9 (I dropped `2026-11-01`, nothing special about
  it), plus a local-date test and a broken-seed test.

**Old tests I changed on Day 12** (the brief changed what they test):

- `TaskForm.test.tsx`: "has a disabled submit button with a visible note" became "has a working
  submit button and no 'next update' note any more". The other 3 old form tests now pass props.
- `App.test.tsx` (5 tests) and `TaskItem.test.tsx` (2 tests): queries like `{ name: /Write report/ }`
  became `{ name: /^Write report/ }` (see "What broke"), and the keyboard tests press Tab once more
  for the new checkbox. What they check did not change.

**Do the tests really catch bugs?** I broke the code on purpose and put it back each time:

| What I broke                                                      | Tests that failed                               |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| `toggleDone` changes the old task object                          | 1                                               |
| The double-click guard switched off                               | 1                                               |
| The unsaved-changes check switched off                            | 5                                               |
| The Undo timer never pauses                                       | 2                                               |
| The Undo timer is not cleared (no `clearTimeout`)                 | 4                                               |
| Save writes back a copy taken when Edit was clicked (lost update) | 2                                               |
| The edit form gets a fixed key instead of `key={task.id}`         | 2                                               |
| **Day 13:** the one-request-per-task guard on "done" switched off | 1 (2 PATCHes instead of 1)                      |
| **Day 14:** the search built with `new RegExp(needle)`            | 2 ("Nothing to repeat" on `c++`)                |
| **Day 15:** the dialog's "first answer wins" guard removed        | 0 at first, then 1 (see "What broke on Day 15") |
| **Day 15:** `--color-text-muted` (light) set to a pale grey       | 2 (both contrast pairs with it)                 |
| **Day 15:** a `color: #ff0000` added to `layout.css`              | 1 (no raw colours)                              |
| **Day 15:** the backup copy of damaged storage removed            | 3 (one per kind of broken value)                |

## What broke on Day 15

Real problems and surprises from Day 15 (parts A and B):

1. **jsdom has no `<dialog>` API.** `showModal` is not a function there, so every dialog test
   crashed at first. `src/test/setup.ts` adds a small stand-in that only sets `open` and fires
   `close`. Focus trapping and the inert page are the browser's job, so I checked those in Edge.
2. **The double-click test passed with the guard switched off.** After the first click the parent
   stops rendering the dialog, so the second click lands on nothing. The test was right about the
   app, but it did not test the dialog's own guard. I added `ConfirmDeleteDialog.test.tsx`, where
   the parent keeps the dialog on screen: with the guard off it fails (2 confirms instead of 1).
3. **One commit had a type error, and my check did not see it.** The CSS test first used `node:fs`,
   but the app's tsconfig has no Node types. I ran `tsc -b | head`, and the pipe hid tsc's exit
   code, so the commit went through. I fixed it before the next commit and amended that local,
   unpushed commit.
4. **The fix made the CSS test pass with nothing to check.** Reading the CSS with Vite's `?raw`
   gave **empty strings**: Vitest blanks CSS files unless `test.css.include` matches them. The
   "no raw colours" test passed on empty text while 53 others failed. Now `vite.config.ts` lets CSS
   through in tests, and a first test checks that all five CSS files are found and not empty. To
   prove it, I added `color: #ff0000` to `layout.css`: 1 test failed, then I removed it.
5. **`import.meta.glob('../**/*.css')` gave mixed keys** (`../index.css` but `./tokens.css`), so
   my path matching missed files. A root-relative pattern (`/src/**/*.css`) gives one form.
6. **"←Back to tasks" lost its space.** Making the link `inline-flex` (for the 44 px height) drops
   the trailing space inside the arrow's `<span>`. I only saw it in the screenshot; a `gap` fixed it.
7. **All my first screenshots were dark.** This PC is set to dark mode, so headless Edge used the
   dark theme even without emulating it. I forced `prefers-color-scheme: light` for the light ones.
8. **A Day 14 test failed once in the full run** ("expected 'Loading task… | Tasks' to be 'Task not
   found | Tasks'"), then once in 3 runs of that file alone, then 0 times in 8 runs on `main` and 8
   on this branch. The tab title is set in an effect, which can run a moment after the DOM shows
   the page, and `waitForLoad()` only waited for the DOM. It now waits for the title too.
9. **The lint failed after the switch to two sources** (part B): "React Hook useEffect has a
   missing dependency: 'getTasks'". The load effect now read `getTasks` from the chosen source,
   but its dependency list was still `[loadAttempt]`. It now calls `source.getTasks` and depends on
   `[loadAttempt, source]`, so a different source would load again.
10. **axe found zero violations on the first run.** That made me suspicious, so I added a control
    test with a nameless button: axe reports `button-name`, so the setup really checks.

## What broke on Day 14

Real problems and surprises from Day 14:

1. **Part A: the first commit had almost nothing in it.** The first `git add` failed with a pathspec
   error (a deleted file was already staged), so the first commit had almost nothing and the second
   had all the code, and `package.json` wasn't committed. I reset the two commits and redid them,
   then checked each with `git show --stat`. Now I check `git show --stat` after every commit.
2. **My laptop died in the middle of Part B.** Work stopped mid-task with uncommitted changes.
   Before continuing I checked `git status` and `git diff` to see exactly what was done. Lesson:
   commit smaller and more often.
3. **A test found the same message twice.** "Task marked done, but hidden by your filters." is on
   the page **and** in the hidden live region, so `getByText` failed with "Found multiple
   elements". The app was right; the test now looks for the message in the visible note.
4. **Two selects were called "Priority".** My first filter test failed with "Found multiple
   elements with the role combobox and name Priority": the filter and the add form's field had the
   same label. A screen reader user would hear the same. The filter is now "Filter by priority".
5. **oxlint failed on the test helper** (`only-export-components`): I had put the small
   `LocationProbe` component inside `renderApp.tsx`, next to plain functions. It has its own file now.
6. **A "hidden by your filters" message could stay wrong.** While reviewing the code I saw that
   the message was only cleared by the next task action, not by a filter change: add a task under
   "Done", click "Pending", and the visible task was still called hidden. Changing a filter now
   removes the message; a test does exactly those steps.
7. **I broke the search on purpose** with `new RegExp(needle)`: 2 tests failed with "Invalid
   regular expression: /c++/: Nothing to repeat". Then I put the plain `includes` back.

## What broke on Day 13

Real problems and surprises from Day 13:

1. **`.env.example` would not have been committed.** The `.gitignore` from the Vite template has
   `.env*`, which also matches `.env.example`. I saw it when I checked which files git would add, and
   added `!.env.example` under it.
2. **The seed test failed with "The URL must be of scheme file".** In the jsdom test environment
   `URL` is jsdom's class, and Node's `readFileSync` rejects it. The test reads a file and needs no
   DOM, so it now runs in the Node environment (`// @vitest-environment node` at the top).
3. **One API test hung for 5 seconds.** My fake "hanging" fetch only listened for a future abort. A
   signal that was **already** aborted never fired, so the promise never settled. The real `fetch`
   rejects at once in that case, so I made the fake do the same.
4. **oxlint failed the build check:** "`announce` is read while its declaration is still being
   initialized" (`react(immutability)`). The load effect, near the top of `App`, called `announce`,
   which is declared further down. I moved the effect below the helper functions.
5. **json-server answers a duplicate id with an HTML stack trace and status 500**, not JSON. I found
   it by sending requests with curl before writing the API code. That is why an error status is
   turned into a message **before** the body is read, and why Undo waits for its DELETE to finish.
6. **A second `npm run api` crashed with `EADDRINUSE`** while the first one was still running. That
   became the "Port 3001 busy" note in "How to run".
7. **My unmount test failed first:** I checked that `document.body` was empty after `unmount()`, but
   Testing Library leaves its empty container `<div>` in the body. The right check is that the
   **container** is empty.
8. **All 20 new save tests passed on the first run**, which made me suspicious again (like Day 11).
   I switched off the one-request-per-task guard for "done": the double-click test failed with 2
   PATCH requests instead of 1. Then I put the guard back.

## What broke on Day 12

Real problems and surprises from Day 12:

1. **Node was too old on this laptop.** Linux Mint had Node 18.19, and Vite 8 needs 20.19+ or
   22.12+. I installed Node 22 with nvm (no sudo); after that `npm ci` and the 73 old tests passed
   before I changed anything.
2. **The new buttons broke 5 old App tests.** `getByRole('button', { name: /Write report/ })` now
   found three buttons, because "Edit Write report" and "Delete Write report" also match. Fix: start
   the pattern with `^` (`/^Write report/`). Adding the checkbox later broke 2 more tests (the old keyboard test and my new
   Undo focus test), because each row now has one more Tab stop.
3. **A double click did not add two tasks, but it showed an error.** React re-renders between the two
   clicks, so the second submit saw the already-cleared form and showed "Title is required" on an
   empty form the user had just saved. I only saw this by switching my guard off: the test failed
   on the error message, not on the task count. Fix: right after a successful add, an empty submit is
   ignored until the user types again.
4. **Fake timers made all 12 delete tests hang** ("Test timed out in 5000ms"). My first guess (React's
   scheduler needs `setImmediate`, so fake fewer timers) was wrong: they still hung. A test with one
   plain button and one click hung too, so it was not my code. The real cause: Testing Library waits
   for a `setTimeout(0)` after every action, and only moves fake timers forward if a global `jest`
   object exists. Vitest has none. Fix: `src/test/fakeTimers.ts` adds a small `jest` stand-in.
5. **`element.focus()` in a test did not pause the Undo timer**, because the focus event ran outside
   React's `act()`. Reaching the button with Shift+Tab, like a real keyboard user, works and is the
   better test anyway.
6. **A browser date input never gives an invalid date.** jsdom (like a browser) turns
   `"2026-02-30"` into `""`, and a half-typed date in Firefox or Chrome also gives `""`. So a wrong
   date looked like "no date" and would have been saved without one. Fix: the form also checks
   `input.validity.badInput`. The test for a bad date uses a 5-digit year (`20266-11-12`), which a
   date input does keep.
7. **`key={index}` on the task list broke no test.** I tried it to see the keys test fail, and all
   165 tests still passed: these rows have no state of their own, so nothing could move to the wrong
   row. The key that really mattered was the one on the **edit form**: with a fixed key, 2 tests
   failed (switching from editing A to B kept A's values). So I added a small demo list with its own
   state per row to show the index bug for real (`src/keys.test.tsx`).
8. **The Urdu title showed empty boxes in Firefox on Linux.** The bold "ہ" was missing because the
   fallback font (DejaVu Sans) does not have it. The font was not missing on the laptop: Noto Sans
   Arabic is installed. Fix: `'Noto Sans Arabic', 'Noto Naskh Arabic'` in the font list, before
   `sans-serif`. Windows skips them and uses its own font as before.
9. **The first 320 px screenshot showed the wrong state.** Headless Firefox took the picture before my
   check script's `setTimeout` steps ran (it still said "waiting"), and the snap version of Firefox
   could not write the file to `/tmp`. I changed the script to wait with promises instead of
   timers and saved the picture in my home folder.

## What broke on Day 11

Real problems and surprises from building Day 11:

1. **The new Vite template is different from the tutorials.** `create-vite` 9 set up **oxlint**, not
   ESLint, and TypeScript 7. Its `tsconfig.app.json` had no `"strict": true` line, so I added
   `strict` and `noUncheckedIndexedAccess` myself instead of trusting a default.
2. **The template broke my own rule.** As soon as I turned on `no-non-null-assertion`, the lint failed
   on the template's `document.getElementById('root')!` in `main.tsx`. I replaced it with a null check
   that throws a clear error.
3. **"Impure function during render".** I first wrote `today = toLocalDateString(new Date())` as a
   default prop in `App`. oxlint's `react(purity)` rule flagged it, and with `--deny-warnings` the lint
   failed. Fix: read the date once in `main.tsx` and pass `today` as a prop. This also made the App
   tests simpler, because they always pass a fake date.
4. **Line endings.** Git (with `core.autocrlf`) warned it would turn LF into CRLF, but Prettier
   expects LF. I added `.gitattributes` with `eol=lf` so the two tools agree.
5. **My 320px screenshot was misleading.** Headless Edge would not make a window narrower than about
   492px, so the "320px" screenshot really showed a 492px page, cut off. I only noticed because the
   right edge was missing. To test properly I made a probe page that zooms the layout down to 246 CSS
   px and counts the elements that go past the screen edge: 0.
6. **All 60 tests in the first version of the suite passed on the first run**, which made me suspicious. To check they can really fail,
   I broke the code on purpose (looked up the selected task in `tasks` instead of `visibleTasks`). The
   "clears the detail when the filter hides the selected task" test failed as it should, then I put
   the code back.
7. **The demo was only right on one day.** The first sample data had fixed due dates written for
   10 Nov 2026, so on any other day the wrong tasks showed as "Overdue" or "Due today", or none did.
   Now `createSampleTasks(today)` (since Day 13: `npm run db:reset` from `db.seed.json`) builds the dates from the user's local today with `addDays()`
   (local date parts, no `toISOString`, no UTC). A test builds the data for 9 different "todays" and
   checks there is always exactly one "Due today" and one "Overdue" not-done task. To prove the test
   works, I moved the overdue task onto today on purpose: 10 tests failed, then I put it back.

## Tech

React 19, TypeScript 7 (strict), Vite 8, plain CSS with custom properties, axe-core 4.14.0, localStorage (live demo), Vercel, oxlint, Prettier, Vitest 5, React Testing Library, jsdom,
json-server 0.17.4 (mock API), concurrently.
