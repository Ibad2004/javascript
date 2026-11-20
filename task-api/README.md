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
| POST | /auth/signup | 201 `{user, token}` | 400, 409 (email taken), 413, 503 |
| POST | /auth/login | 200 `{user, token}` | 400, 401 (same message for a wrong password and an unknown email), 503 |
| GET | /auth/me | 200 `{user}` | 401 |
| GET | /tasks | 200 your tasks | 401 |
| GET | /tasks/:id | 200 task | 401, 404 |
| POST | /tasks | 201 new task + `Location` header | 400, 401, 413 |
| PATCH | /tasks/:id | 200 updated task | 400, 401, 404, 413 |
| DELETE | /tasks/:id | 204 | 401, 404 (also on a second delete) |

Every error is JSON `{ "error": "..." }`. Validation errors (400) also have `fields`: `{ "error": "...", "fields": { "title": "..." } }`.
Auth errors (401) also have a `code`. Any unexpected error is 500 `Something went wrong`; database down is 503.

Validation uses **Zod** ([src/validate.ts](src/validate.ts)): `title` 1 to 100 characters (trimmed), `description` up to 500
(default `""`), `priority` low/medium/high (default medium), `dueDate` null or a real `YYYY-MM-DD` date, `done` boolean.
The server makes the `id` and it can never change. **Unknown fields are stripped**, not rejected (so a client can never set `owner`).
Signup: `email` (trimmed, lowercased, unique), `password` 8 to 72 characters.

Tests use `mongodb-memory-server` (never Atlas). Wrong password or IP not allowed: the server exits with a clear
message. Invalid id: 404 `Task not found`. Database down: 503. `tags` (up to 10 unique strings, 1 to 20 characters)
are embedded in each task. Indexes: `{owner, done, dueDate}` and `{tags}`.

## Auth

Set `JWT_SECRET` (at least 32 characters, the server will not start without it) and optionally `JWT_EXPIRES_IN` (default `1h`) in `.env`.
Never commit `.env`.

Flow: `POST /auth/signup` or `/auth/login` returns `{ user, token }`. Send the token on every `/tasks` call as
`Authorization: Bearer <token>`. Passwords are hashed with `bcryptjs` (cost 12, pure JS, no native build); only the hash is stored
and it is never returned. The token is an HS256 JWT with the user id as `sub`. Each task has an `owner`; every query filters by it,
so another user's task is a 404 (its existence is not revealed). Login runs a bcrypt compare even for an unknown email.

| 401 `code` | When |
| --- | --- |
| `AUTH_REQUIRED` | no or malformed `Authorization` header |
| `TOKEN_EXPIRED` | the token is past its expiry |
| `TOKEN_INVALID` | bad signature, tampered, or the user no longer exists |

### What happens if the token expires

The API answers 401 `{ "error": "Your session expired. Please log in again.", "code": "TOKEN_EXPIRED" }`. Nothing is deleted.
The client should drop the token and send the user to the login page; after logging in they get a new token (1 hour by default).
There are no refresh tokens yet.

### Demo account (local demo only)

`npm run seed` creates `demo@example.com` / `DemoPass123`, gives it the sample tasks, and assigns Day 17 tasks that had no owner to it
(nothing is deleted). Never use this account or password on a real deployment.
It also creates `admin@example.com` / `AdminPass123` with `role: "admin"` (local demo only). Roles are `"user"` (default) or `"admin"`;
signup ignores any `role` the client sends, so an admin can only be made in the database or by the seed.

### curl examples

```bash
curl -s -X POST localhost:4000/auth/signup -H 'Content-Type: application/json' -d '{"email":"me@example.com","password":"Password123"}'
curl -s -X POST localhost:4000/auth/login  -H 'Content-Type: application/json' -d '{"email":"demo@example.com","password":"DemoPass123"}'
TOKEN=<paste the token from the response>
curl -s localhost:4000/tasks -H "Authorization: Bearer $TOKEN"
```

## Embed vs reference

| | Embedded: `tags` in the task | Referenced: `owner` user (Day 18) |
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

## Stats

Both routes need a token. `GET /stats?tz=Asia/Karachi` (default `UTC`; an unknown zone is 400) returns the caller's own numbers.
`GET /stats/users` is admin only.

**401 vs 403:** 401 = we do not know who you are (no, bad or expired token). 403 = we know who you are and you may not do this
(a normal user on `/stats/users`: `{ "error": "Admins only", "code": "FORBIDDEN" }`).

**Facet or separate pipelines?** `/stats` uses one `$facet` after `$match { owner }`: the three results come from one pass over
the user's tasks and one index read, and the owner filter is written once, so no branch can forget it. Cost: a facet output is one
document (16 MB limit; fine, we only return counts). `/stats/users` is its own pipeline because it starts from `users`.

### byStatus + byPriority + byWeek (one `$facet`)

```js
Task.aggregate([
  { $match: { owner } },                       // first stage: uses the { owner, done, dueDate } index
  { $facet: {
    status:   [{ $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: ["$done", 1, 0] } },
                 overdue: { $sum: { $cond: [{ $and: [{ $eq: ["$done", false] }, { $eq: [{ $type: "$dueDate" }, "string"] },
                                                      { $lt: ["$dueDate", today] }] }, 1, 0] } } } }],
    priority: [{ $group: { _id: "$priority", n: { $sum: 1 } } }],
    week:     [{ $addFields: { week: { $dateToString: { format: "%Y-%m-%d", timezone: tz,
                 date: { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday", timezone: tz } } } } } },
               { $match: { week: { $gte: oldestMonday } } },
               { $group: { _id: "$week", n: { $sum: 1 } } }],
  } },
])
```

The same in Postgres (`tasks(owner_id, title, priority, due_date date, done, created_at timestamptz)`):

```sql
-- byStatus
SELECT count(*)                                              AS total,
       count(*) FILTER (WHERE done)                          AS done,
       count(*) FILTER (WHERE NOT done)                      AS pending,
       count(*) FILTER (WHERE NOT done AND due_date < (now() AT TIME ZONE :tz)::date) AS overdue
FROM tasks WHERE owner_id = :me;

-- byPriority
SELECT priority, count(*) FROM tasks WHERE owner_id = :me GROUP BY priority;

-- byWeek, last 8 weeks, empty weeks = 0
SELECT w::date AS week, count(t.id) AS count
FROM generate_series(date_trunc('week', now() AT TIME ZONE :tz) - interval '7 weeks',
                     date_trunc('week', now() AT TIME ZONE :tz), interval '1 week') AS w
LEFT JOIN tasks t ON t.owner_id = :me
 AND date_trunc('week', t.created_at AT TIME ZONE :tz) = w
GROUP BY w ORDER BY w;
```

Postgres `date_trunc('week', ...)` also starts on Monday. `created_at AT TIME ZONE :tz` turns a `timestamptz` into local time first,
which is what `timezone: tz` does in `$dateTrunc`. Mongo has no `generate_series`, so the empty weeks are filled in the code
(`weekList` in [src/stats.ts](src/stats.ts)); Mongo `dueDate` is a string, Postgres can use a real `date`.

### Per-user report (admin)

```js
User.aggregate([
  { $lookup: { from: "tasks", localField: "_id", foreignField: "owner",
               pipeline: [{ $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: ["$done", 1, 0] } } } }], as: "s" } },
  { $set: { s: { $ifNull: [{ $first: "$s" }, { total: 0, done: 0 }] } } },
  { $project: { _id: 0, userId: { $toString: "$_id" }, email: 1, total: "$s.total", done: "$s.done",
                pending: { $subtract: ["$s.total", "$s.done"] } } },   // listed fields only: no passwordHash
  { $sort: { total: -1, email: 1 } },
])
```

```sql
SELECT u.id AS user_id, u.email,
       count(t.id)                           AS total,
       count(t.id) FILTER (WHERE t.done)     AS done,
       count(t.id) FILTER (WHERE NOT t.done) AS pending
FROM users u LEFT JOIN tasks t ON t.owner_id = u.id   -- LEFT JOIN keeps users with 0 tasks
GROUP BY u.id, u.email
ORDER BY total DESC, u.email;
```

I started from `users` (not from `$group` on tasks) so a user with no tasks still appears; the `$group` runs inside the `$lookup`.

Example reply of `GET /stats?tz=Asia/Karachi`:

```json
{ "tz": "Asia/Karachi",
  "byStatus": { "total": 4, "done": 1, "pending": 3, "overdue": 1 },
  "byPriority": { "low": 1, "medium": 2, "high": 1 },
  "byWeek": [ { "week": "2026-09-28", "count": 0 }, { "week": "2026-10-05", "count": 0 }, "... 6 more, oldest first ...",
              { "week": "2026-11-16", "count": 3 } ] }
```

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

## What broke on Day 18

- A bad `dueDate` such as `16/11/2026` returned 500: Zod 4 still runs a `.refine` after a failed `.regex`, and `toISOString()` threw
  `RangeError: Invalid time value`. The refine now checks for an invalid date first.
- `npm ci` plus the first `npm run check` took more than two minutes on this machine (slow install), so the command ran in the background.

## What broke on Day 19

- Nothing failed: `npm run check` (47 tests) passed on the first run after the code was written.
- Careful spot: `Intl.supportedValuesOf("timeZone")` does not list `UTC` on some Node versions, so `UTC` is added by hand.

## CORS

Browsers block a page on one origin (the React tracker, `http://localhost:5173`) from reading replies of another (this API, port 3000) unless the API sends CORS headers.
Only the origins in `CORS_ORIGINS` (comma-separated, default `http://localhost:5173,http://127.0.0.1:5173`) get them; any other origin gets none, so its browser blocks it.
curl and PowerShell send no `Origin`, so they still work. Auth is a Bearer token, so credentials/cookies are off.
`cors` is the first middleware so every reply, including 400/401/403/404/500, carries the header and the tracker can read the error message; it also answers preflight `OPTIONS` with 204 before auth runs.
