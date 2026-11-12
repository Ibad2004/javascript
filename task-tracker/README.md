# Task Tracker

A small task tracker built with **Vite + React + TypeScript**.
This is a one-week project: every day I add to the **same app**.

| Day | What the day adds                                                                                         | Status  |
| --- | --------------------------------------------------------------------------------------------------------- | ------- |
| 11  | Tracker pages with **static data**: components, JSX, props, state                                         | Done    |
| 12  | Add, edit and delete tasks **in memory**: events, forms, controlled inputs, lists and keys                | Done    |
| 13  | Read tasks from a mock API (**json-server**): `useEffect`, fetching, loading and error states             | Done    |
| 14  | Filters, a task detail page and a `useTasks` hook: custom hooks, lifting state, context, **React Router** | Planned |
| 15  | Styling, basic accessibility and a responsive layout, then deploy on **Vercel**                           | Planned |

Days 14 and 15 are planned. Since Day 13 the tasks are saved on a local mock server (json-server), so a
page refresh keeps the changes. The header says so on screen too.

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

Other scripts: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run format`,
`npm.cmd run format:check`, `npm.cmd run test:watch`.

On Linux or macOS use plain `npm` (`npm ci`, `npm run dev`, `npm run check`). Vite 8 needs
**Node 20.19+ or 22.12+**. If `node --version` is older, install a newer one with
[nvm](https://github.com/nvm-sh/nvm): `nvm install 22`.

## Component tree

```
App                      owns all the state; loads the tasks (useEffect), saves in event handlers
├── Header               title + "Saved on the local mock server (json-server)"
├── <p> / error box      "Loading tasks…" (aria-busy), or the error message + [Try again], in App
├── TaskSummary          "3 of 8 done" (updates live), or "No tasks yet"  (this and below: once loaded)
├── <p> / notice box     "2 items ... were skipped", or a failed tick/delete/Undo [Dismiss], in App
├── <button>             "Hide done tasks" / "Show done tasks" toggle (aria-pressed), in App
├── <p role=status>      "Showing 5 tasks", the empty message or the all-hidden message, in App
├── UndoBar              "Task deleted. [Undo]" for 5 s, paused on hover/focus (key = deleted task id)
├── HiddenTasksNote      "3 done tasks hidden [Show them]" (only while done tasks are hidden)
├── TaskList             the <ul>; one TaskItem per visible task, key = task.id
│   └── TaskItem         <li>: [checkbox] [select button: title + info] [Edit] [Delete]; "Saving…" while busy
├── TaskDetail           the selected task, or "Select a task to see its details"
│   │                    while editing, it shows instead:
│   ├── UnsavedChangesBar  "You have unsaved changes [Save] [Discard]" (only when needed)
│   └── TaskForm         EDIT mode: prefilled, "Save" + "Cancel", key = task.id
├── TaskForm             ADD mode: the same component, empty, "Add task" / "Saving…", clears after a save
└── LiveRegion           visually hidden role=status: "Task added", "Changes saved", "Task deleted", ...
```

**One form for add and edit.** `TaskForm` takes `initialValues`, `submitLabel`, `onSubmit` and
`onCancel` (plus `tasks`, `today` and `editingId` for the warnings). Add and edit only differ in those
props, so the validation, counters and messages are written once.

**Why the row changed.** On Day 11 each task was one `<button>`. A checkbox or an Edit button _inside_
a `<button>` is invalid HTML (screen readers and browsers handle it badly), so each `<li>` now has four
controls next to each other. Edit, Delete and the checkbox have the task title in their accessible
name ("Edit Buy milk", "Delete Buy milk", "Mark Buy milk as done"), so a screen reader list of
buttons is not just "Edit, Edit, Edit".

Folders:

```
src/
  App.tsx                 the top component (state lives here)
  main.tsx                reads today's date once and renders <App today={...} />
  types.ts                Priority, Task, TaskInput and TaskFormValues types
  api/tasks.ts            the ONLY file that calls fetch: getTasks, createTask, updateTask,
                          deleteTask, the type guard and the friendly errors
  components/             one component per file, each with typed props
  utils/tasks.ts          pure logic: addTask, updateTask, deleteTask, restoreTask, toggleDone,
                          validateTask, makeId, countChars, sorting and filtering
  utils/                  also dates, plurals, scrolling and the focus target ids
  test/                   test setup, makeTask(), renderApp(), the fake json-server
                          (fakeServer.ts, a vi.spyOn on fetch) and the fake-timer helper
db.seed.json              the 8 demo tasks with "dueInDays" (tracked by git)
db.json                   the live data json-server serves (ignored by git)
scripts/                  db.mjs + seed.mjs: build db.json from the seed with local dates
```

## Props and state

| Data                                                   | Kind                | Where it lives                  | Why                                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks`                                                | state (`useState`)  | App                             | The list, the summary, the detail and both forms need it, so it sits above all of them. Changed only with `setTasks((old) => ...)`. Since Day 13 it starts empty and is filled from the server. |
| `loadState`, `loadAttempt`                             | state (`useState`)  | App                             | **Day 13.** `loading` / `error` (+ message) / `ready`. "Try again" adds 1 to `loadAttempt`, which the load effect depends on.                                                                   |
| `skippedCount`                                         | state (`useState`)  | App                             | **Day 13.** How many items in `db.json` failed the type guard, for the one small warning.                                                                                                       |
| `busyIds` (+ `busyRef`)                                | state + ref         | App → TaskList → TaskItem       | **Day 13.** Tasks with a request running. The ref answers at once (a double click), the state re-renders the rows as disabled.                                                                  |
| `notice`                                               | state (`useState`)  | App                             | **Day 13.** The last failed tick / delete / Undo, or a 404, shown above the list until dismissed.                                                                                               |
| `isSaving`, `submitError`                              | state (`useState`)  | each TaskForm                   | **Day 13.** "Saving…" and the disabled button while `onSubmit` runs; the server's error under the form (the typed values stay).                                                                 |
| `hideDone`                                             | state (`useState`)  | App                             | It changes both the list and the "N hidden" note, so it lives in their shared parent.                                                                                                           |
| `selectedId`                                           | state (`useState`)  | App                             | TaskList highlights it and TaskDetail shows it: siblings can only share data through their parent.                                                                                              |
| `editingId`                                            | state (`useState`)  | App                             | **New.** Which task is in the edit form. One id means only one task can be edited at a time.                                                                                                    |
| `editIsDirty`                                          | state (`useState`)  | App                             | **New.** TaskForm reports whether the edit values differ from the task. App needs it to decide if the unsaved-changes bar is shown.                                                             |
| `pendingAction`                                        | state (`useState`)  | App                             | **New.** What the user tried to do (select or edit another task) while there were unsaved changes. Save or Discard then finishes it.                                                            |
| `lastDeleted`                                          | state (`useState`)  | App                             | **New.** `{ task, index }` of the latest delete, so Undo can put it back at the same index. One slot: only the latest delete can be undone.                                                     |
| `announcement`                                         | state (`useState`)  | App → LiveRegion                | **New.** The text for screen readers ("Task added"). It carries a counter, so the same text twice is read twice.                                                                                |
| `focusRequest`                                         | state (`useState`)  | App                             | **New.** Where focus should go after add/edit/delete. An effect moves the focus after React has put the element on the page.                                                                    |
| form values                                            | state (`useState`)  | each TaskForm                   | **New.** `title`, `description`, `priority`, `dueDate` as strings: every input is controlled. Each form owns its own draft.                                                                     |
| `triedSubmit`, `dateIsBad`                             | state (`useState`)  | each TaskForm                   | **New.** "Title is required" shows only after a submit attempt. `dateIsBad` stores the browser's `validity.badInput` for half-typed dates.                                                      |
| `isHovered`, `hasFocus`                                | state (`useState`)  | UndoBar                         | **New.** Either one pauses the 5 s timer. The time left is kept in a ref, so pausing does not re-render.                                                                                        |
| `visibleTasks`                                         | derived (not state) | computed in App on every render | Filtered and sorted from `tasks` + `hideDone`. A second copy in state could get out of sync.                                                                                                    |
| `selectedTask`, `editingTask`                          | derived (not state) | computed in App                 | Looked up by id. `selectedTask` in the _visible_ list; `editingTask` in _all_ tasks, so ticking it done while done tasks are hidden keeps the form and the draft.                               |
| `today`                                                | prop                | main.tsx → App → children       | Read once outside React (rendering stays pure). Used for due labels and the past-date warning. Tests pass a fake date.                                                                          |
| `makeId`                                               | prop (function)     | App                             | **New.** Makes the id of a new task (`crypto.randomUUID()`). Tests pass a fake one that gives `new-1`, `new-2`, ...                                                                             |
| `onSelect`, `onEdit`, `onDelete`, `onToggleDone`       | prop (callback)     | App → TaskList → TaskItem       | Children cannot change App's state directly, so they call functions App gives them.                                                                                                             |
| `initialValues`, `submitLabel`, `onSubmit`, `onCancel` | prop                | App → TaskForm                  | **New.** The only differences between the add form and the edit form.                                                                                                                           |

State is never changed in place. Every update builds a new array or object with spread, `map`,
`filter` or `toSpliced`, and the pure functions in `src/utils/tasks.ts` are tested on **frozen**
arrays, so a mutation would throw in the test.

## Day 13: the tracker reads from a mock API (json-server)

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
  prefer a fixed label with only `aria-pressed` changing. I will look at this again on Day 15.

## Tests

**227 tests in 18 files** (Day 12 had 165 in 15), run with Vitest + React Testing Library + jsdom.
No test calls a real server: the network is replaced with `vi.spyOn(globalThis, 'fetch')`, either
directly or through `src/test/fakeServer.ts`, a small in-memory json-server (same 404 and
duplicate-id 500 answers as the real one) that can also fail, hang or hold a request.

| File                                  | Tests | What it checks                                                                                                                                                                                        |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/tasks.test.ts`             | 35    | sorting, filtering, summary texts, addTask, updateTask, deleteTask, restoreTask, toggleDone (frozen arrays), validateTask, countChars, makeId, **plus** getChangedFields, setDone, replaceTask        |
| `src/api/tasks.test.ts`               | 26    | **Day 13.** every API function: ok, 404, 500 (body cancelled), server off, 8 s timeout, non-JSON, bad items skipped, duplicate ids, extra fields dropped, PATCH body = only the changes, caller abort |
| `src/components/TaskForm.test.tsx`    | 24    | labels, submit prevented, trimming, required title, counters, emoji, paste not cut, 100/500 limits, invalid and half-typed dates, warnings, double click, edit mode, Escape                           |
| `src/App.save.test.tsx`               | 20    | **Day 13.** "Saving…", failed add/edit keep the text, PATCH only changed fields, optimistic done/delete + rollback, Undo with the same id, 404 from another tab, double clicks                        |
| `src/utils/dates.test.ts`             | 17    | formatting, null, invalid dates, leap years, local today, addDays, overdue / today with a fake today                                                                                                  |
| `scripts/seed.test.mjs`               | 14    | **Day 13** (was `sampleTasks.test.ts`, 15). The seed: 6 to 8 tasks, unique ids, valid dates, edge cases present, one due today + one overdue for 8 "todays", local date, broken seed                  |
| `src/App.load.test.tsx`               | 14    | **Day 13.** loading → ready, error → Try again, empty list, StrictMode double effect, abort on unmount, 8 s timeout, non-JSON, bad items warning, reload keeps changes                                |
| `src/App.edit.test.tsx`               | 13    | prefilled form, focus, Save, Escape/Cancel, empty title blocked, one edit at a time, unsaved-changes bar (Save / Discard / invalid), no `window.confirm`                                              |
| `src/App.delete.test.tsx`             | 12    | delete + announce, focus next/previous/heading, empty state, Undo position, 5 s timer, pause on hover and focus, latest only, selected/edited task, no timer leak                                     |
| `src/components/TaskItem.test.tsx`    | 12    | text status/priority, overdue, due today, aria-pressed + dir, keyboard, Edit/Delete/checkbox names, row layout (no control inside another)                                                            |
| `src/App.test.tsx`                    | 10    | empty list, sort order, toggle + aria-pressed, hidden note + Show them, all hidden, select / deselect, stale detail cleared, keyboard                                                                 |
| `src/App.add.test.tsx`                | 7     | add + trim + focus + announce, Enter, spaces-only title, double click, empty state goes away, duplicate allowed, header note                                                                          |
| `src/App.done.test.tsx`               | 7     | summary live, Space, sort after tick, hide done + tick, focus, lost update (edit + tick + Save stays done), edited task hidden keeps its draft                                                        |
| `src/components/TaskDetail.test.tsx`  | 4     | null message, "No description" (empty and spaces only), full detail with line breaks                                                                                                                  |
| `src/components/TaskSummary.test.tsx` | 4     | 0 tasks, 1 of 1, some done, all done                                                                                                                                                                  |
| `src/keys.test.tsx`                   | 3     | the keys demo (see "Why keys matter")                                                                                                                                                                 |
| `src/utils/scroll.test.ts`            | 3     | smooth scroll, reduced motion, no scroll on wide screens                                                                                                                                              |
| `src/utils/plural.test.ts`            | 2     | 0 / 1 / 2 and a custom plural                                                                                                                                                                         |

Every date test uses a fake today (`2026-11-10`), so the tests never depend on the real date. The
Undo tests use Vitest fake timers (see "What broke").

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

| What I broke                                                      | Tests that failed          |
| ----------------------------------------------------------------- | -------------------------- |
| `toggleDone` changes the old task object                          | 1                          |
| The double-click guard switched off                               | 1                          |
| The unsaved-changes check switched off                            | 5                          |
| The Undo timer never pauses                                       | 2                          |
| The Undo timer is not cleared (no `clearTimeout`)                 | 4                          |
| Save writes back a copy taken when Edit was clicked (lost update) | 2                          |
| The edit form gets a fixed key instead of `key={task.id}`         | 2                          |
| **Day 13:** the one-request-per-task guard on "done" switched off | 1 (2 PATCHes instead of 1) |

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

React 19, TypeScript 7 (strict), Vite 8, oxlint, Prettier, Vitest 5, React Testing Library, jsdom,
json-server 0.17.4 (mock API), concurrently.
