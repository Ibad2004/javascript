# Task Tracker

A small task tracker built with **Vite + React + TypeScript**.
This is a one-week project: every day I add to the **same app**.

| Day | What the day adds                                                   | Status  |
| --- | ------------------------------------------------------------------- | ------- |
| 11  | Tracker pages with **static data**: components, JSX, props, state   | Done    |
| 12  | Adding tasks for real (the form starts working, `setTasks` is used) | Planned |
| 13  | Changing tasks: mark done, edit, delete                             | Planned |
| 14  | Keeping tasks between visits (saving and loading them)              | Planned |
| 15  | Real styling (today's CSS is deliberately plain)                    | Planned |

Days 12 to 14 are my plan and may change. Day 15 is fixed as the styling day.

## How to run

You need Node.js. On Windows PowerShell use `npm.cmd` (the `npm.ps1` script is blocked by the
execution policy).

```powershell
npm.cmd install      # install dependencies
npm.cmd run dev      # start the dev server, then open the printed URL
npm.cmd test         # run the tests once
npm.cmd run check    # lint + tests + type check and production build
```

Other scripts: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run format`,
`npm.cmd run format:check`, `npm.cmd run test:watch`.

## Component tree

```
App                    owns the data and the state; filters and sorts the list on every render
├── Header             app title + "Demo tasks. Changes aren't saved yet."
├── TaskSummary        "3 of 8 done", or "No tasks yet"
├── <button>           "Hide done tasks" / "Show done tasks" toggle (aria-pressed), in App
├── <p role=status>    "Showing 5 tasks", the empty message or the all-hidden message, in App
├── HiddenTasksNote    "3 done tasks hidden [Show them]" (only while done tasks are hidden)
├── TaskList           the <ul>; one TaskItem per visible task, key = task.id
│   └── TaskItem       one <button> per task: title, done status, priority, due date
├── TaskDetail         everything about the selected task, or "Select a task to see its details"
└── TaskForm           the add-task form (static today: labelled inputs, disabled submit)
```

Folders:

```
src/
  App.tsx              the top component (state lives here)
  main.tsx             reads today's date once and renders <App today={...} />
  types.ts             Priority and Task types
  data/sampleTasks.ts  8 static demo tasks
  components/          one component per file, each with typed props
  utils/               pure logic: sorting, filtering, dates, plurals, scrolling
  test/                test setup and a makeTask() helper
```

## Props and state

| Data                   | Kind                  | Where it lives                  | Why                                                                                                                                    |
| ---------------------- | --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks`                | state (`useState`)    | App                             | Several components need it (summary, list, detail). Tomorrow the form will add tasks, so it must sit above both the form and the list. |
| `hideDone`             | state (`useState`)    | App                             | It changes both the list and the "N hidden" note, so it lives in their shared parent.                                                  |
| `selectedId`           | state (`useState`)    | App                             | TaskList highlights it and TaskDetail shows it: siblings can only share data through their parent.                                     |
| `visibleTasks`         | derived (not state)   | computed in App on every render | Filtered and sorted from `tasks` + `hideDone`. A second copy in state could get out of sync.                                           |
| `selectedTask`         | derived (not state)   | computed in App                 | Looked up by id in the visible list, so a hidden task can never show as a stale detail.                                                |
| `today`                | prop                  | main.tsx → App → children       | Read once outside React (rendering stays pure). Tests pass a fake date.                                                                |
| `tasks` (summary/list) | prop                  | App → TaskSummary, TaskList     | Children only read data; they never own it.                                                                                            |
| `task`, `isSelected`   | prop                  | TaskList → TaskItem             | Each item only needs its own task and whether it is selected.                                                                          |
| `onSelect`, `onShow`   | prop (callback)       | App → TaskList/TaskItem, Note   | Children cannot change App's state directly, so they call a function App gives them.                                                   |
| `task` (detail)        | prop (`Task \| null`) | App → TaskDetail                | `null` means "nothing selected" and shows the empty message.                                                                           |

State updates use the updater form, for example `setHideDone((h) => !h)`.

## Edge cases (developer side)

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
- **Sample data test**: ids are unique, titles are not empty, dates are valid, and every edge case
  above is present in the data.

## Edge cases (from the user's side)

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
- Keyboard: every task is a real `<button>`, so Tab reaches it and Enter/Space select it. Every control
  has a visible focus ring (`:focus-visible`).
- Form: every input has a `<label>`, and Enter does not reload the page (`onSubmit` +
  `preventDefault`). The disabled button has a visible note: "Adding tasks comes in the next update."
- Layout: rem units and a single column below 48rem. Checked in a real browser (Edge) with the
  layout squeezed to 246 CSS px: no element went past the edge of the screen.

**Known limits** (honest list):

- "Today" is read once when the page loads. If the tab stays open past midnight, reload it.
- The sample dates are fixed (written on 10 Nov 2026), so on other days different tasks will show as
  overdue or due today.
- The toggle changes both its label and `aria-pressed`, as the brief asked. Some screen reader guides
  prefer a fixed label with only `aria-pressed` changing. I will look at this again on Day 15.

## Tests

**60 tests in 10 files**, run with Vitest + React Testing Library + jsdom.

| File                                  | Tests | What it checks                                                                                                                        |
| ------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.test.tsx`                    | 10    | empty list, sort order, toggle + aria-pressed, hidden note + Show them, all hidden, select / deselect, stale detail cleared, keyboard |
| `src/components/TaskItem.test.tsx`    | 6     | text status/priority, overdue, done never overdue, due today, aria-pressed + dir, keyboard                                            |
| `src/components/TaskDetail.test.tsx`  | 4     | null message, "No description" (empty and spaces only), full detail with line breaks                                                  |
| `src/components/TaskForm.test.tsx`    | 4     | labels, disabled button + note, submit prevented, Enter does not crash                                                                |
| `src/components/TaskSummary.test.tsx` | 4     | 0 tasks, 1 of 1, some done, all done                                                                                                  |
| `src/utils/dates.test.ts`             | 14    | formatting, null, invalid dates, leap years, local today, overdue / today with a fake today                                           |
| `src/utils/tasks.test.ts`             | 8     | sort order, no mutation, filter, summary text, list status text and plurals                                                           |
| `src/data/sampleTasks.test.ts`        | 5     | 6 to 8 tasks, unique ids, non-empty titles, valid dates, edge cases present                                                           |
| `src/utils/scroll.test.ts`            | 3     | smooth scroll, reduced motion, no scroll on wide screens                                                                              |
| `src/utils/plural.test.ts`            | 2     | 0 / 1 / 2 and a custom plural                                                                                                         |

Every date test uses a fake today (`2026-11-10`), so the tests never depend on the real date.

## What broke

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
6. **All 60 tests passed on the first run**, which made me suspicious. To check they can really fail,
   I broke the code on purpose (looked up the selected task in `tasks` instead of `visibleTasks`). The
   "clears the detail when the filter hides the selected task" test failed as it should, then I put
   the code back.

## Tech

React 19, TypeScript 7 (strict), Vite 8, oxlint, Prettier, Vitest 5, React Testing Library, jsdom.
