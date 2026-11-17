# task-api

A small Express 5 + TypeScript API for tasks, saved in **MongoDB (Atlas)** with Mongoose.
It uses the same `Task` shape as `task-tracker/src/types.ts`, so the React app can use it on Day 20.

## MongoDB Atlas setup (no secrets in git)

1. Create a free M0 cluster at cloud.mongodb.com.
2. Database Access: add a database user with a password.
3. Network Access: allow your IP (Add Current IP Address).
4. Connect > Drivers: copy the `mongodb+srv://...` string, put the database name `task-tracker` after the host.
5. `Copy-Item .env.example .env`, then paste your string into `.env`. `.env` is git-ignored; never commit it.

## Run

```powershell
npm.cmd install
npm.cmd run seed       # sample tasks, only if the collection is empty (never deletes)
npm.cmd run dev        # http://localhost:4000 (loads .env; set PORT to change it; 3001 is json-server)
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

Tests use `mongodb-memory-server` (never Atlas). Wrong password or IP not allowed: the server exits with a clear
message. Invalid id: 404 `Task not found`. Database down: 503. `tags` (up to 10 unique strings, 1 to 20 characters)
are embedded in each task. Indexes: `{done, dueDate}` and `{tags}`.

## Embed vs reference

| | Embedded: `tags` in the task | Referenced: user (from Day 18) |
| --- | --- | --- |
| Size | small, bounded (max 10) | shared, grows |
| Belongs to | one task only | many tasks |
| Read | always with its task | also on its own |

Rule: embed what is small and read together; reference what is shared, read alone or unbounded.

Same design in SQL (Postgres):

```sql
CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL);
CREATE TABLE tasks (
  id serial PRIMARY KEY, title text NOT NULL, done boolean DEFAULT false,
  due_date date, user_id int REFERENCES users(id)   -- Day 18
);
CREATE TABLE task_tags (task_id int REFERENCES tasks(id) ON DELETE CASCADE, tag text NOT NULL, PRIMARY KEY (task_id, tag));
```

In Mongo the `task_tags` rows become the `tags` array inside the task (no join); `user_id` becomes an ObjectId `ref`.

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

## What broke on Day 17

- Mongoose 9 warned that `new: true` is deprecated for `findByIdAndUpdate`; changed to `returnDocument: "after"`.
- `.gitignore` had `.env*`, which would also hide `.env.example`; added `!.env.example`.
