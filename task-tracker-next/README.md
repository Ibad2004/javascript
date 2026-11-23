# Task Tracker in Next.js (Day 21)

The Week 3 task tracker rebuilt with the Next.js App Router. Today: routing, layouts, server vs client components.
Data is static sample data (`src/lib/sampleTasks.ts`); MongoDB comes on Day 22, server actions on Day 23, auth on Day 24, deploy on Day 25.

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
| `src/app/(main)/tasks/[id]/page.tsx` | `/tasks/1` the detail page (unknown id: not-found page) |
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
