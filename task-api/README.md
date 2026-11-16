# task-api

A small Express 5 + TypeScript API for tasks, kept **in memory** (data resets when the server restarts).
It uses the same `Task` shape as `task-tracker/src/types.ts`, so the React app can use it on Day 20.

## Run

```powershell
npm.cmd install
npm.cmd run dev        # http://localhost:4000 (set PORT to change it; 3001 is json-server)
npm.cmd run check      # typecheck + tests + build
```

## Routes

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | /health | 200 `{status:"ok"}` | |
| GET | /tasks | 200 list | |
| GET | /tasks/:id | 200 task | 404 |
| POST | /tasks | 201 new task + `Location` header | 400, 413 |
| PATCH | /tasks/:id | 200 updated task | 400, 404, 413 |
| DELETE | /tasks/:id | 204 | 404 (also on a second delete) |

Every error is JSON `{ "error": "..." }`.

Validation is hand-written (Zod comes on Day 18): `title` 1 to 100 characters (trimmed), `description` up to 500
(default `""`), `priority` low/medium/high (default medium), `dueDate` null or a real `YYYY-MM-DD` date, `done` boolean.
The server makes the `id` and it can never change. **Unknown fields are ignored**, not rejected.

## Middleware order and why

Order in [src/app.ts](src/app.ts):

1. **Request logger**: first, so it times every request, even failed ones. Silent when `NODE_ENV=test`.
2. **`express.json({ limit: "10kb" })`**: before the routes, which read `req.body`. It rejects bad or too large JSON.
3. **`/tasks` router** (and `/health`): after the body is parsed. The first match answers.
4. **`notFound`**: after all routes, so only unmatched requests reach it. 404 `Route not found`.
5. **`errorHandler`**: last, because it only catches errors from middleware registered before it. Invalid JSON 400,
   too large 413, missing or non-JSON body 400, `ApiError` its own status, anything else 500 (the stack is logged
   on the server only).

Express 5 forwards rejected promises from async handlers to `errorHandler`, so no `try/catch` or `next(err)` is needed.

## PowerShell examples

```powershell
Invoke-RestMethod http://localhost:4000/tasks
Invoke-RestMethod -Method Post http://localhost:4000/tasks -ContentType "application/json" -Body '{"title":"Buy milk","priority":"high"}'
Invoke-RestMethod -Method Patch http://localhost:4000/tasks/1 -ContentType "application/json" -Body '{"done":true}'
```

## What broke

- `npm install vitest @types/node@20` failed with ERESOLVE: Vitest 5 needs `@types/node` 22 or newer. Fixed by using
  `@types/node@22` (the `engines` field still says Node >=20.19).
