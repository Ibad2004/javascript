# Day 06 - Promises, async/await, fetch and Error Handling

Day 6 is about code that **waits**: promises, `async`/`await`, calling a real
API with `fetch`, and what to do when the network or the server fails. The
hand-in is a Node script that downloads users and their posts from a public
API, retries when a request fails for a temporary reason, and saves a summary
to a JSON file without ever leaving a half-written file behind.

## How to run

Run every command from the repository root:

```bash
node day-06/01-promise-basics.js
node day-06/02-promise-all-vs-sequential.js
node day-06/03-retry-demo.js
node day-06/main.js
node --test "day-06/*.test.js"
```

The quotes around `"day-06/*.test.js"` matter: Node expands the pattern itself,
so the same command works in Bash and in PowerShell.

| File | What it does |
| --- | --- |
| [config.js](config.js) | One frozen config object: API address, attempts, timeout, delays, output file |
| [fetch-with-retry.js](fetch-with-retry.js) | `fetchJsonWithRetry(url, options)`: fetch + timeout + `response.ok` check + retry with backoff |
| [save-json.js](save-json.js) | `saveJson(filePath, data)`: writes pretty JSON safely (temp file, then rename) |
| [summary.js](summary.js) | Pure functions, no network: `validateUsers` and `buildSummary` |
| [main.js](main.js) | Wires it all together: fetch users, fetch posts in parallel, build the summary, save it |
| [01-promise-basics.js](01-promise-basics.js) | Promise states, `.then`/`.catch` vs `async`/`await`, `try`/`catch`/`finally`, a rejected promise |
| [02-promise-all-vs-sequential.js](02-promise-all-vs-sequential.js) | 3 fake 300 ms requests: one by one vs `Promise.all` vs `Promise.allSettled` |
| [03-retry-demo.js](03-retry-demo.js) | Fake fetch that fails twice then succeeds, a 404 that is not retried, all attempts failing |
| [fetch-with-retry.test.js](fetch-with-retry.test.js) | 36 tests for retry, backoff, Retry-After, timeout and option checks |
| [save-json.test.js](save-json.test.js) | 7 tests for the safe file write |
| [summary.test.js](summary.test.js) | 17 tests for validation, totals, average and partial failures |
| [output/users-summary.json](output/users-summary.json) | One real result of `node day-06/main.js` |

63 tests in total. They use a fake `fetch` and a fake `sleep`, so they never
touch the network and never really wait for a retry delay.

### Exit codes of main.js

| Code | When |
| --- | --- |
| `0` | Everything worked and the file was saved |
| `1` | `/users` could not be loaded (a short message is printed, no stack trace) |
| `2` | Some users' posts failed after all retries; the file is still saved with those users marked |

## Requirements

- **Node 22 or newer.** The code uses built-in `fetch`, `AbortSignal.timeout`,
  `import.meta.dirname`, `URL.canParse` and `node --test` with a glob pattern.
- **Internet only for `main.js`.** The tests and the three demo files run fully
  offline, because they use fake requests.
- **No `.env` file.** JSONPlaceholder is a free, public, read-only API with no
  API key and no secrets, so there is nothing to hide.
- **No npm packages.** Only Node built-ins: `fetch`, `node:fs/promises`,
  `node:path`, `node:crypto`, `node:timers/promises`, `node:test`,
  `node:assert/strict`.

## The data

API: [https://jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com), a free fake REST API for practice.

| Step | Request | What I take from it |
| --- | --- | --- |
| 1 | `GET /users` | The list of users: `id`, `name`, `email`, `address.city`, `company.name` |
| 2 | `GET /posts?userId=<id>` for **every** user, all at the same time | Only the length of the array = the user's post count |

All settings come from one object in `config.js`:

```js
export const config = Object.freeze({
  baseUrl: "https://jsonplaceholder.typicode.com",
  maxAttempts: 3,
  timeoutMs: 5000,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  outputFile: path.join(import.meta.dirname, "output", "users-summary.json"),
});
```

`Object.freeze` stops any file from changing a setting by accident, so the rules
(3 attempts, 5 s timeout, 500 ms base delay) are the same everywhere.
`import.meta.dirname` is the folder of `config.js`, so the output always goes to
`day-06/output/` no matter which folder the command is run from.

### Output shape

| Field | Meaning |
| --- | --- |
| `source` | The API address |
| `fetchedAt` | When the run started, ISO format |
| `totalUsers` | Number of users from `/users` |
| `totalPosts` | Sum of the post counts that are numbers (failed users are skipped) |
| `averagePostsPerUser` | `totalPosts` / users with a number post count, rounded to 2 decimals, `0` when there are none |
| `users` | `{ id, name, email, city, company, postCount }` for every user; `postCount` is `null` if their posts failed |
| `errors` | `{ userId, message }` for every user whose posts failed |

Real example, the start of [output/users-summary.json](output/users-summary.json):

```json
{
  "source": "https://jsonplaceholder.typicode.com",
  "fetchedAt": "2026-11-02T18:06:05.619Z",
  "totalUsers": 10,
  "totalPosts": 100,
  "averagePostsPerUser": 10,
  "users": [
    {
      "id": 1,
      "name": "Leanne Graham",
      "email": "Sincere@april.biz",
      "city": "Gwenborough",
      "company": "Romaguera-Crona",
      "postCount": 10
    },
```

and the end of the same file:

```json
    {
      "id": 10,
      "name": "Clementina DuBuque",
      "email": "Rey.Padberg@karina.biz",
      "city": "Lebsackbury",
      "company": "Hoeger LLC",
      "postCount": 10
    }
  ],
  "errors": []
}
```

In the real run nothing failed, so `errors` is empty. This test shows what a
partial failure looks like (user 2's posts failed, users 1 and 3 worked):

```js
    assert.equal(summary.totalUsers, 3);
    assert.equal(summary.users.length, 3);
    assert.equal(summary.users[1].postCount, null);
    assert.equal(summary.users[1].name, "User 2");
    assert.equal(summary.totalPosts, 15);
    assert.equal(summary.averagePostsPerUser, 7.5);
    assert.deepEqual(summary.errors, [
      { userId: 2, message: "GET /posts?userId=2 failed after 3 attempts. Last reason: HTTP 503" },
    ]);
```

User 2 is still in `users` (with `postCount: null`), and the average is
`15 / 2 = 7.5`, not `15 / 3`, because only users with a real number are counted.

### Real output of main.js

```text
Fetching users from https://jsonplaceholder.typicode.com/users
Fetching posts for 10 users in parallel
  1. Leanne Graham: 10 posts
  2. Ervin Howell: 10 posts
  3. Clementine Bauch: 10 posts
  4. Patricia Lebsack: 10 posts
  5. Chelsey Dietrich: 10 posts
  6. Mrs. Dennis Schulist: 10 posts
  7. Kurtis Weissnat: 10 posts
  8. Nicholas Runolfsdottir V: 10 posts
  9. Glenna Reichert: 10 posts
  10. Clementina DuBuque: 10 posts
Users: 10, posts: 100, average per user: 10
Saved to day-06\output\users-summary.json
```

This was run on Windows, so the path uses `\`. On macOS or Linux it prints
`day-06/output/users-summary.json`.

---

## 1. Promise and its 3 states

**What:** a promise is an object that stands for a value that is not ready
yet. It is always in one of 3 states:

| State | Meaning |
| --- | --- |
| **pending** | Still waiting (the request is still on its way) |
| **fulfilled** | Finished with a value (the data arrived) |
| **rejected** | Finished with an error (the server was down) |

Once a promise is fulfilled or rejected it is **settled** and never changes again.

**Why here:** every network request and every file write in this project
returns a promise, because the answer comes later.

**Where in real apps:** loading a feed, sending a message, uploading a photo:
the screen shows a spinner while the promise is pending, the data when it is
fulfilled, and an error message when it is rejected.

`01-promise-basics.js` shows the state of a promise without waiting for it:

```js
async function stateOf(promise) {
  const notSettled = Symbol("not settled");
  try {
    const value = await Promise.race([promise, notSettled]);
    return value === notSettled ? "pending" : `fulfilled with ${JSON.stringify(value)}`;
  } catch (error) {
    return `rejected with "${error.message}"`;
  }
}
```

The trick: `Promise.race` takes whichever finishes first. `notSettled` is a
plain value, so it counts as "already done". If `promise` is also already
settled, it wins because it is **first** in the array; if it is still pending,
the symbol wins and we know the promise is pending. JavaScript has no
built-in way to read a promise's state, which is why this trick is needed.

Real output:

```text
1. The 3 states of a promise
  loading: pending
  ready:   fulfilled with "ready"
  failed:  rejected with "server down"
  loading after 50 ms: fulfilled with "data"
```

## 2. `.then` / `.catch`

**What:** `.then(fn)` runs `fn` with the value when the promise is fulfilled.
`.catch(fn)` runs `fn` with the error when it is rejected. Each returns a new
promise, so they can be chained.

**Why here:** it is the original way of using promises. I show it next to
`async`/`await` to prove they do the same thing.

**Where in real apps:** older code bases, short one-liners like
`fetch(url).then((r) => r.json())`, and handling one promise without making
the whole function `async`.

```js
function withThenCatch(id) {
  return getUser(id)
    .then((user) => console.log(`  .then  -> found ${user.name}`))
    .catch((error) => console.log(`  .catch -> ${error.message}`));
}
```

## 3. `async` / `await`

**What:** `async` makes a function always return a promise. Inside it,
`await promise` pauses **this function** until the promise settles, then gives
the value (or throws the error).

**Why here:** the retry loop is much easier to read as a normal `for` loop
with `await` than as a chain of `.then` calls.

**Where in real apps:** almost all modern API code: a React `useEffect` that
loads data, a Next.js server component, an Express route handler.

```js
async function withAwait(id) {
  try {
    const user = await getUser(id);
    console.log(`  await -> found ${user.name}`);
  } catch (error) {
    console.log(`  catch -> ${error.message}`);
  }
}
```

Real output (same results as `.then`/`.catch`):

```text
2. .then/.catch vs async/await (same result)
  .then  -> found Leanne Graham
  .catch -> User 99 not found
  await -> found Leanne Graham
  catch -> User 99 not found
```

`await` pauses only its own function, not the whole program:

```js
  const task = (async () => {
    console.log("  inside: before await");
    await wait(50);
    console.log("  inside: after await");
  })();
  console.log("  outside: still running while the function waits");
  await task;
```

```text
5. await pauses only its own async function
  inside: before await
  outside: still running while the function waits
  inside: after await
```

`main.js` and the demos use `await` at the **top level** of the file (outside
any function), for example `process.exitCode = await main();`. That only works
because the repo uses ES modules (`"type": "module"` in `package.json`).

## 4. `fetch`

**What:** the built-in function for HTTP requests. `fetch(url)` returns a
promise of a `Response`; `await response.text()` or `response.json()` reads
the body (also a promise, because the body can arrive in pieces).

**Why here:** to call JSONPlaceholder without installing a package like axios.

**Where in real apps:** every web app that talks to a server: loading
products, logging in, sending a form, calling a payment API.

## 5. `response.ok`

**What:** `true` when the HTTP status is 200-299, `false` otherwise.

**Why here:** `fetch` does **not** throw on 404 or 500. The server did
answer, so for `fetch` the request "worked". Without checking `response.ok`,
the code would try to read an error page as data.

**Where in real apps:** every API call should check it, e.g. showing "Product
not found" on 404 instead of crashing on an empty page.

```js
async function attemptOnce(url, { timeoutMs, fetchFn }) {
  let response;
  let text;
  try {
    response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok) text = await response.text();
  } catch (error) {
    throw networkError(error, timeoutMs);
  }
  if (!response.ok) throw httpError(response);
  return parseJson(text);
}
```

Line by line:

- `fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) })`: a **new**
  timeout signal for every attempt (see section 9).
- `if (response.ok) text = await response.text();` is **inside** the `try`.
  Reading the body can also fail (the connection drops halfway, or the timeout
  fires while the body is still downloading), and that is a network problem
  too, so it must be caught by the same `catch`.
- The body of an error response is never read, because it is not used.
- `if (!response.ok) throw httpError(response);` is **outside** the `try`,
  so an HTTP error is not mixed up with a network error.
- `response.text()` + `parseJson(text)` instead of `response.json()`: this way
  I can tell "empty body" and "invalid JSON" apart and give a clear message
  for each.

```js
function parseJson(text) {
  if (text.trim() === "") {
    throw requestError("empty response body", { retryable: false });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw requestError(`invalid JSON: ${error.message}`, { retryable: false, cause: error });
  }
}
```

## 6. `try` / `catch` / `finally`

**What:** `try` runs code, `catch` runs if it throws (or if an `await`ed
promise rejects), and `finally` runs **always**, success or failure.

**Why here:** `main.js` catches a failed `/users` request and prints a short
message instead of a stack trace. `saveJson` uses `catch` to delete the temp
file if the write fails.

**Where in real apps:** turning off a loading spinner, closing a database
connection, re-enabling a "Pay" button: things that must happen whether the
request worked or not.

```js
async function loadProfile(id) {
  console.log(`  spinner on (user ${id})`);
  try {
    const user = await getUser(id);
    console.log(`  show profile of ${user.name}`);
  } catch (error) {
    console.log(`  show error: ${error.message}`);
  } finally {
    console.log("  spinner off");
  }
}
```

```text
3. try/catch/finally: finally runs on success and on failure
  spinner on (user 1)
  show profile of Leanne Graham
  spinner off
  spinner on (user 99)
  show error: User 99 not found
  spinner off
```

A rejected promise that is handled with `.catch` gives a value, but the
original promise stays rejected:

```text
4. A rejected promise
  handled: payment declined
  state of the original promise: rejected with "payment declined"
```

## 7. Retry

**What:** if a request fails for a reason that may go away by itself, try it
again a few times before giving up.

**Why here:** a free public API can be slow or briefly overloaded. One failed
request out of eleven should not ruin the whole run.

**Where in real apps:** payment retries, file uploads on a bad mobile
connection, sending messages when Wi-Fi comes back, background jobs.

Which errors are retried:

```js
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
```

| Retried | Not retried |
| --- | --- |
| Network error (no connection, DNS failure, connection reset) | 400 Bad Request, 401, 403, 404 Not Found, 422 and every other 4xx |
| Timeout | Invalid JSON |
| 408 Request Timeout, 429 Too Many Requests | Empty body |
| 500, 502, 503, 504 (server errors) | |

**Why 404 is not retried but 503 is:** 503 means "the server is busy right
now": the same request may work in one second. 404 means "this does not
exist": asking again gives the same 404 every time, so retrying only wastes
time and puts more load on the server. The same goes for invalid JSON: the
server sent a wrong answer, and sending the request again will not fix it.

The retry loop:

```js
export async function fetchJsonWithRetry(url, options = {}) {
  const settings = resolveOptions(url, options);
  const { maxAttempts } = settings;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptOnce(url, settings);
    } catch (error) {
      if (!error.retryable) {
        throw new Error(`GET ${url} failed (not retried): ${error.message}`, { cause: error });
      }
      lastError = error;
      if (attempt === maxAttempts) break;
      const delayMs = retryDelay(error, attempt, settings);
      settings.onRetry({ url, attempt, maxAttempts, reason: error.message, delayMs });
      await settings.sleep(delayMs);
    }
  }

  throw new Error(`GET ${url} failed after ${plural(maxAttempts, "attempt")}. Last reason: ${lastError.message}`, {
    cause: lastError,
  });
}
```

- `return await attemptOnce(...)`: the `await` is needed here. Without it,
  a rejected promise would be returned **past** the `try`, and `catch` would
  never see the error.
- `if (attempt === maxAttempts) break;`: no point waiting after the last attempt.
- `{ cause: error }`: the final error keeps the real reason (with its HTTP
  `status`) in `error.cause`, so nothing is lost.

Every error made inside the file carries a `retryable` flag:

```js
function requestError(reason, { retryable, status = null, retryAfterMs = null, cause } = {}) {
  return Object.assign(new Error(reason, { cause }), { retryable, status, retryAfterMs });
}
```

`Object.assign` adds extra fields to a normal `Error`, so the loop only has to
check `error.retryable` and does not need to know about status codes.

Real output of `03-retry-demo.js` (fake fetch, delays shortened to 50 ms):

```text
1. 503, then a network error, then success
  fetch call 1
  Attempt 1/3 failed (HTTP 503), retrying in 50 ms
  fetch call 2
  Attempt 2/3 failed (network error: fetch failed), retrying in 100 ms
  fetch call 3
  Success: {"id":1,"name":"Leanne Graham"}
  fetch was called 3 time(s)

2. 404 is NOT retried
  fetch call 1
  Error: GET https://api.example.com/users/1 failed (not retried): HTTP 404
  Cause: HTTP 404
  fetch was called 1 time(s)

3. Every attempt fails
  fetch call 1
  Attempt 1/3 failed (HTTP 503), retrying in 50 ms
  fetch call 2
  Attempt 2/3 failed (HTTP 503), retrying in 100 ms
  fetch call 3
  Error: GET https://api.example.com/users/1 failed after 3 attempts. Last reason: HTTP 503
  Cause: HTTP 503
  fetch was called 3 time(s)
```

### Why `sleep` and `fetchFn` are passed in

```js
    fetchFn = fetch,
    sleep = delay,
    onRetry = () => {},
```

By default the real `fetch` and a real timer are used. The tests pass in fakes
instead:

```js
  const sleep = async (ms) => {
    delays.push(ms);
  };
```

The fake `sleep` does not wait at all, it only **records** the delay. So a test
can check that the delays were exactly `[500, 1000]` and still finish in under
a millisecond, and the fake `fetchFn` returns a scripted list of answers
(503, then 200) without any network. This is called **dependency injection**:
the function gets its tools from outside instead of reaching for global ones.
`onRetry` is injected for the same reason: `main.js` uses it to print a log
line, the tests use it to record what happened.

`sleep = delay` comes from this import at the top of the file:

```js
import { setTimeout as delay } from "node:timers/promises";
```

`node:timers/promises` has a version of `setTimeout` that returns a promise,
so `await delay(500)` waits 500 ms. It is renamed to `delay` so it does not
hide the normal `setTimeout`.

## 8. Exponential backoff

**What:** wait a little before the first retry, and **double** the wait each
time after that, up to a maximum.

**Why here:** if the server is overloaded, retrying right away makes it worse.
Waiting longer each time gives it time to recover.

**Where in real apps:** Gmail "Trying to reconnect in 5s... 10s... 20s", cloud
SDKs (AWS, Google Cloud), message queues, mobile apps syncing in the background.

```js
const backoffDelay = (attempt, { baseDelayMs }) => baseDelayMs * 2 ** (attempt - 1);

const retryDelay = (error, attempt, settings) =>
  Math.min(error.retryAfterMs ?? backoffDelay(attempt, settings), settings.maxDelayMs);
```

The formula `baseDelayMs * 2 ** (attempt - 1)` with `baseDelayMs = 500`:

| Failed attempt | `2 ** (attempt - 1)` | Delay | After the cap (`maxDelayMs = 5000`) |
| --- | --- | --- | --- |
| 1 | 1 | 500 ms | 500 ms |
| 2 | 2 | 1000 ms | 1000 ms |
| 3 | 4 | 2000 ms | 2000 ms |
| 4 | 8 | 4000 ms | 4000 ms |
| 5 | 16 | 8000 ms | **5000 ms** |

- `attempt - 1` makes the first retry wait exactly `baseDelayMs`, not double it.
- `**` is the power operator: `2 ** 3` is `8`.
- `Math.min(..., settings.maxDelayMs)` is the cap, so the wait never grows
  without limit.
- `??` means "use the left side unless it is `null` or `undefined`". If the
  server sent a valid Retry-After, that wins; otherwise the backoff is used.
  `||` would be wrong here, because `Retry-After: 0` gives `0`, and `||` would
  throw that `0` away.

With the default `maxAttempts: 3` there are 2 retries, so the delays are
exactly `[500, 1000]`.

## 9. Retry-After

**What:** a header the server sends with a 429 (Too Many Requests) to say
"wait this many seconds before asking again".

**Why here:** if the server says how long to wait, its number is better than
my guess.

**Where in real apps:** many public APIs (GitHub's, for example) send
Retry-After when you hit their rate limit; good clients respect it to avoid
being blocked.

```js
function parseRetryAfterMs(headerValue) {
  if (headerValue === null || !/^\d+$/.test(headerValue.trim())) return null;
  return Number(headerValue.trim()) * 1000;
}
```

- `headers.get("retry-after")` returns `null` when the header is missing, so
  that is checked first.
- `/^\d+$/` means "only digits, from start to end". It accepts `"2"` and `"0"`,
  and rejects `"-1"`, `"1.5"`, `"soon"`, `""` and the date form
  (`"Wed, 21 Oct 2026 07:28:00 GMT"`). I only support the seconds form; any
  other value falls back to normal backoff instead of guessing.
- `* 1000`: the header is in **seconds**, the timers use **milliseconds**.
- The value still goes through the `Math.min` cap above, so
  `Retry-After: 120` waits 5000 ms, not 2 minutes.

It is only read for status 429:

```js
  const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response.headers.get("retry-after")) : null;
```

## 10. Timeout

**What:** a limit on how long one request may take. After that, it is
cancelled.

**Why here:** without a timeout, a server that never answers would make the
script hang forever. With `timeoutMs: 5000`, a stuck attempt fails after 5 s
and is retried.

**Where in real apps:** a checkout page that shows "This is taking longer
than usual" instead of spinning forever, mobile apps on weak signal, health
checks between servers.

`AbortSignal.timeout(timeoutMs)` makes a signal that aborts by itself after
`timeoutMs`. `fetch` listens to it and rejects with a `TimeoutError`, which
is turned into a clear message:

```js
function networkError(error, timeoutMs) {
  const reason =
    error?.name === "TimeoutError" ? `timeout after ${timeoutMs} ms` : `network error: ${messageOf(error)}`;
  return requestError(reason, { retryable: true, cause: error });
}
```

`messageOf(error)` uses `error.message` only when the thrown value really is an `Error`. If something
else is thrown (for example the string `"offline"`), it uses `String(error)`, so the reason reads
`network error: offline` instead of `network error: undefined`.

A new signal is created for every attempt. One shared signal would already be
aborted after the first timeout, and every retry would fail instantly.

The test does not wait 5 seconds. Its fake fetch never answers, it only
rejects when the signal fires, and the test uses `timeoutMs: 20`:

```js
const hangUntilAborted = () => (init) =>
  new Promise((resolve, reject) => {
    const keepAlive = setTimeout(() => {}, 60_000);
    init.signal.addEventListener("abort", () => {
      clearTimeout(keepAlive);
      reject(init.signal.reason);
    });
  });
```

**Why the `keepAlive` timer:** the timer inside `AbortSignal.timeout` does not keep Node
running on its own (it is "unref'd"). On Node 22, while the fake fetch waits for that
signal, Node sees nothing else to wait for, decides the test file is finished and cancels
the remaining tests. The empty `keepAlive` timer keeps Node running until the signal fires,
and it is cleared straight away so it never slows the tests down. Real requests in
`main.js` do not need this, because an open network connection keeps Node running.

## 11. Temp file + rename

**What:** write the new content to a temporary file next to the real one,
then **rename** it over the real file.

**Why here:** if the script crashes or the laptop shuts down in the middle of
writing, the old `users-summary.json` is still whole. A rename inside the same
folder is a single step for the file system: other programs see either the
old complete file or the new complete file, never half of each.

**Where in real apps:** editors saving your document, databases, package
managers writing `package-lock.json`, apps saving settings.

```js
  const tempFile = path.join(folder, `.${path.basename(filePath)}.${randomUUID()}.tmp`);

  await mkdir(folder, { recursive: true });
  try {
    await writeFile(tempFile, text, "utf8");
    await rename(tempFile, filePath);
  } catch (error) {
    await rm(tempFile, { force: true });
    throw error;
  }
```

- The temp file is in the **same folder** (`folder`), because renaming between
  different drives is not a single step any more.
- `randomUUID()` gives every save its own temp name, so two runs at the same
  time do not write into the same temp file.
- The leading `.` hides the temp file on macOS and Linux.
- `mkdir(folder, { recursive: true })` creates `output/` if it is missing, and
  does nothing if it already exists.
- `rm(tempFile, { force: true })`: if something fails, remove the temp file;
  `force` means "no error if it is already gone".

Data that cannot become JSON is rejected **before** any file is touched:

```js
function toJsonText(data) {
  let text;
  try {
    text = JSON.stringify(data, null, 2);
  } catch (error) {
    throw new TypeError(`data cannot be turned into JSON: ${error.message}`, { cause: error });
  }
  if (text === undefined) {
    throw new TypeError(`data cannot be turned into JSON: got ${typeof data}`);
  }
  return `${text}\n`;
}
```

`JSON.stringify` **throws** for circular objects and BigInt, but silently
**returns `undefined`** for `undefined`, functions and symbols. Both cases must
be checked, or the file would contain the text `undefined`.

## 12. `Promise.all`

**What:** takes several promises and gives one promise that fulfils with all
the results (in the same order) when every one has fulfilled, or rejects as
soon as **any one** rejects.

**Why here:** in the demo, to show that 3 requests started together take as
long as the slowest one, not the sum.

**Where in real apps:** a dashboard that needs the user, their settings and
their notifications before it can show anything: if one fails, the page
shows an error anyway.

## 13. `Promise.allSettled`

**What:** like `Promise.all`, but it **never rejects**. It waits for every
promise and gives an array of `{ status: "fulfilled", value }` or
`{ status: "rejected", reason }`.

**Why here:** the 10 post requests are independent. If user 7's posts fail, I
still want the other 9 counts, so `main.js` uses `allSettled`:

```js
function loadPostsInParallel(users) {
  console.log(`Fetching posts for ${users.length} users in parallel`);
  return Promise.allSettled(
    users.map((user) =>
      fetchJsonWithRetry(`${config.baseUrl}/posts?userId=${user.id}`, { onRetry: logRetry(`user ${user.id}`) }),
    ),
  );
}
```

`summary.js` turns each result into a post count or an error:

```js
function postCountOf(result) {
  if (result?.status === "rejected") return { error: messageOf(result.reason) };
  if (result?.status !== "fulfilled") return { error: "missing posts result" };
  if (!Array.isArray(result.value)) return { error: "posts response is not an array" };
  return { postCount: result.value.length };
}
```

`messageOf` covers a promise rejected with something that is not an `Error`
(for example the string `"offline"`), which has no `.message`.

A user only gets an entry in `errors` when `postCountOf` returned an `error`. The check is
`row.error !== undefined`, not just `row.error`, so a failure whose message is an empty string `""`
is still listed:

```js
    errors: rows.filter((row) => row.error !== undefined).map((row) => ({ userId: row.user.id, message: row.error })),
```

`email`, `city` and `company` are copied only when they really are text. Anything else from the API
(a number, a list, an object) becomes `null`, so wrong data never reaches the saved file:

```js
      email: stringOrNull(user.email),
      city: stringOrNull(user.address?.city),
      company: stringOrNull(user.company?.name),
```

The totals only use real numbers, and the average cannot become `NaN`:

```js
  const counts = rows.map((row) => row.user.postCount).filter((count) => typeof count === "number");
```

```js
    averagePostsPerUser: counts.length === 0 ? 0 : roundTo2(totalPosts / counts.length),
```

With no users, `0 / 0` would be `NaN`, so that case returns `0` first.
`roundTo2` is `Math.round(value * 100) / 100`: move the decimal point 2 places
right, round, move it back.

**Where in real apps:** sending a newsletter to 1000 people and reporting who
failed, uploading 20 photos and showing which ones need a retry, a dashboard
whose widgets each show their own error.

---

## Conditions these explanations depend on

| Condition | Why it matters here |
| --- | --- |
| `fetch` is built into Node only from **Node 18** | On older Node, `fetch` is not defined and `main.js` cannot run. |
| `AbortSignal.timeout` needs **Node 17.3+** | It is how every attempt gets its timeout. |
| `import.meta.dirname` needs **Node 20.11+** | `config.js` uses it to find the `output/` folder. |
| `fetch` rejects **only on network errors**, not on HTTP errors | A 404 or 500 still fulfils, which is why `response.ok` must be checked by hand. |
| `Promise.all` rejects on the **first** failure | The results of the other promises are lost, even if they succeed. They are **not** cancelled either: they keep running in the background. |
| `Promise.allSettled` **never** rejects | You must look at each `status` yourself, or errors go unnoticed. |
| `await` pauses **only the async function** it is in, not the whole program | Other code, timers and other requests keep running while it waits (see section 3). |
| Top-level `await` needs **ES modules** | Works because `package.json` has `"type": "module"`. |
| Rename is a single step **only inside the same drive / file system** | That is why the temp file is created in the same folder as the target. |
| `allSettled` here starts **all** requests at once | Fine for 10 users. For thousands, you would limit how many run at the same time, or the API may answer with 429. |

## Option checks

`fetchJsonWithRetry` checks its input before sending anything, and the tests
confirm that `fetch` is never called when an option is wrong:

| Input | Error |
| --- | --- |
| `url` not a string, not a valid URL, or not `http:`/`https:` | `TypeError: url must ...` |
| `maxAttempts` not a finite number (`"3"`, `NaN`, `Infinity`, `null`) | `TypeError: maxAttempts must be a finite number` |
| `maxAttempts` outside 1..10, or not whole (`0`, `11`, `1.5`) | `RangeError` |
| `timeoutMs` 0 or less | `RangeError: timeoutMs must be from 1 ...` |
| `baseDelayMs` below 0 | `RangeError: baseDelayMs must be from 0 ...` |
| `maxDelayMs` smaller than `baseDelayMs` | `RangeError: maxDelayMs must be from <baseDelayMs> ...` |
| `fetchFn`, `sleep`, `onRetry` not functions | `TypeError: ... must be a function` |

Two lines that need explaining:

```js
const MAX_TIMER_MS = 2147483647;
```

This is the largest delay Node's timers accept (2^31 - 1 ms, about 24.8 days).
A bigger number makes the timer fire **immediately** instead of waiting, so it
is used as the upper limit for timeouts and delays.

```js
  if (typeof url !== "string" || !URL.canParse(url)) {
```

`URL.canParse` answers "is this a valid URL?" without throwing. The
`typeof url !== "string"` part comes first so that a number or a `URL` object
is rejected with a clear message instead of being turned into a string.

---

## Promise.all vs one by one vs allSettled

Real output of `node day-06/02-promise-all-vs-sequential.js` (same on every run,
because the times are rounded to 100 ms):

```text
3 fake requests, 300 ms each

1. await one by one: 900 ms
2. Promise.all: 300 ms
3. Promise.all, posts fails: rejected after 300 ms with "posts failed"
4. Promise.allSettled, posts fails: 300 ms
   fulfilled: user data
   rejected: posts failed
   fulfilled: comments data
```

```js
async function oneByOne() {
  const user = await fakeRequest("user");
  const posts = await fakeRequest("posts");
  const comments = await fakeRequest("comments");
  return [user, posts, comments];
}

function allAtOnce() {
  return Promise.all([fakeRequest("user"), fakeRequest("posts"), fakeRequest("comments")]);
}
```

The difference is **when each request starts**. In `oneByOne`, `posts` only
starts after `user` has finished. In `allAtOnce`, all three `fakeRequest(...)`
calls run straight away while the array is built, and `Promise.all` only
waits for them.

| | Await one by one | `Promise.all` | `Promise.allSettled` |
| --- | --- | --- | --- |
| Speed (3 x 300 ms) | 900 ms (sum of all) | 300 ms (slowest one) | 300 ms (slowest one) |
| When one fails | Stops at the failure; later requests never start | Rejects; the successful results are lost | Never rejects; you get every result and every error |
| When to use | Each request needs the result of the one before (get the user, then their orders) | Independent requests that are **all** needed (no page without all of them) | Independent requests where partial results are useful (10 users' posts) |
| In this project | `/users` before `/posts` in `main.js`, because the posts need the user ids | Demo only | `main.js` posts |

---

## Edge cases

| Situation | Behaviour | Test |
| --- | --- | --- |
| Works on the first try | 1 call, no waiting | `success on the first try: one call, no waiting` |
| 503, then 200 | Retried once after 500 ms | `503 then 200: retried once after 500 ms` |
| Network error, then 200 | Retried | `network error then 200: retried` |
| Request hangs, then 200 | Times out, retried | `timeout then 200: the AbortSignal fires and the request is retried` |
| 408, 429, 500, 502, 503, 504 | All retried | `retries every retryable status: 408, 429, 500, 502, 503, 504` |
| 404 | Fails at once, 1 call | `404 is not retried` |
| 400 | Fails at once, 1 call | `400 is not retried` |
| Body is not valid JSON | Fails at once, 1 call | `invalid JSON is not retried` |
| Body is empty or only spaces | `empty response body` | `an empty or blank body gives a clear error` |
| Body is `null`, `0` or `false` | Returned as data, not seen as empty | `valid JSON null, 0 and false are returned, not treated as empty` |
| Every attempt fails | Error with URL, attempts, last reason; `cause` kept | `error says the URL, the number of attempts and the last reason, and keeps the cause` |
| Last attempt timed out | `cause.cause` is the `TimeoutError` | `last reason is a timeout and the cause keeps the TimeoutError` |
| `maxAttempts: 1` | No retry, says "1 attempt" | `maxAttempts 1 means no retry and says '1 attempt'` |
| Default backoff | Delays `[500, 1000]` | `exact delays are 500, 1000 with the default config` |
| Long backoff | Capped at `maxDelayMs` | `delays are capped at maxDelayMs` |
| 429 with `Retry-After: 2` | Waits 2000 ms | `Retry-After in seconds is honoured` |
| 429 with `Retry-After: 120` | Waits 5000 ms (cap) | `Retry-After is capped at maxDelayMs` |
| 429 with a bad or missing Retry-After | Normal backoff | `invalid or missing Retry-After falls back to normal backoff` |
| 503 with Retry-After | Header ignored | `Retry-After on a 503 is ignored (only 429 uses it)` |
| Bad URL | `TypeError`, fetch not called | `rejects a bad url with TypeError` |
| `maxAttempts` 0, 11, 1.5 | `RangeError` | `rejects maxAttempts 0, 11 and 1.5 with RangeError` |
| `maxAttempts` `"3"` or `NaN` | `TypeError` | `rejects maxAttempts '3', NaN, Infinity and null with TypeError` |
| `timeoutMs` 0 or `NaN` | Rejected | `rejects timeoutMs 0, negative or NaN` |
| Negative delay | Rejected | `rejects a negative or NaN delay` |
| Output folder missing | Created | `creates a missing folder and writes pretty JSON with a final newline` |
| After saving | No `.tmp` file left | `leaves no temp file behind` |
| Circular data | `TypeError`, nothing written | `rejects circular data with a clear TypeError and writes nothing` |
| `undefined` or a function as data | `TypeError` | `rejects undefined, a function, a symbol and a BigInt` |
| Users is not an array | `TypeError` | `rejects a value that is not an array` |
| User without an integer id | Listed in the error | `rejects a missing or non-integer id` |
| User with a blank name | Listed in the error | `rejects a missing or blank name` |
| Several bad users | All problems in one error | `lists every problem in one error` |
| No users | Average `0`, not `NaN` | `empty users gives average 0, not NaN` |
| One user's posts failed | `postCount: null`, entry in `errors`, totals skip it | `partial failure: postCount null, an errors entry, totals skip the failed user` |
| Every user's posts failed | Average `0`, all in `errors` | `every user failed: average 0, all in errors` |
| A user with 0 posts | Counts as `0`, not as an error | `a user with 0 posts counts as 0, not as an error` |
| Posts response is not an array | Treated as an error for that user | `a posts response that is not an array becomes an error` |
| A posts failure with an empty message | Still listed in `errors` (message `""`) | `a failure with an empty message is still listed in errors` |
| `email`, `city` or `company` that are not text | `null` in the output | `email, city or company that are not strings become null` |
| Something that is not an `Error` is thrown (e.g. `"offline"`) | Reason reads `network error: offline` | `still gives a readable reason` |

---

## What broke and how I fixed it

1. **VS Code closed in the middle of the task.** When I came back, I checked
   every file for code cut off halfway. Nothing was half-written: every
   function was complete, and all 60 tests passed on the first run.
2. I expected fetch to throw on a 404, but it only throws on network errors.
   A 404 comes back as a normal response with ok = false, so I had to check
   response.ok myself.
3. **33 tests were "cancelled" on Node 22.** All 60 tests passed on my PC (Node 24), but on
   Node 22 the timeout test stopped the whole file: `AbortSignal.timeout` uses a timer that does
   not keep Node running, so Node thought the file was finished while the fake fetch was still
   waiting. The README says Node 22 or newer, so that had to work. **Fix:** the test helper
   `hangUntilAborted` holds a `keepAlive` timer until the signal fires (see section 10). Now all
   60 tests pass on Node 22 and Node 24.
4. **Three bugs that I only found on Day 8.** When I converted this script to TypeScript (Day 8),
   strict mode pointed at three places that were unsafe, and running this Day 6 code confirmed
   each one was a real bug:
   - Throwing something that is not an `Error` (like `"offline"`) gave the reason
     `network error: undefined`. **Fix:** `messageOf(error)`.
   - Wrong types from the API (an email that is a number, a city that is a list) were saved into
     the JSON as they were. **Fix:** `stringOrNull`, so anything that is not text becomes `null`.
   - A posts failure with an empty message was left out of `errors`, because `""` counts as false.
     **Fix:** check `row.error !== undefined`.

   Each one now has its own test, so the suite has 63 tests. The full story of how TypeScript
   found them is in [day-08/README.md](../day-08/README.md#bugs-typescript-caught).

## Mutation check

Each row is one deliberate bug, run against a **copy** of the folder, so the
real files were never edited:

| Deliberate bug | File | Result | First failing test |
| --- | --- | --- | --- |
| Retry 404 | fetch-with-retry.js | caught (1 failing) | `404 is not retried` |
| Never retry | fetch-with-retry.js | caught (18 failing) | `503 then 200: retried once after 500 ms` |
| No `response.ok` check | fetch-with-retry.js | caught (20 failing) | `503 then 200: retried once after 500 ms` |
| No cap on the delay | fetch-with-retry.js | caught (2 failing) | `delays are capped at maxDelayMs` |
| Ignore Retry-After | fetch-with-retry.js | caught (3 failing) | `Retry-After in seconds is honoured` |
| No timeout | fetch-with-retry.js | caught (3 failing) | `timeout then 200: the AbortSignal fires and the request is retried` |
| Backoff `2 ** attempt` | fetch-with-retry.js | caught (8 failing) | `503 then 200: retried once after 500 ms` |
| Retry invalid JSON | fetch-with-retry.js | caught (1 failing) | `invalid JSON is not retried` |
| `NaN` average | summary.js | caught (2 failing) | `empty users gives average 0, not NaN` |
| Drop users whose posts failed | summary.js | caught (2 failing) | `partial failure: postCount null, an errors entry, totals skip the failed user` |
| Count a failed user as 0 posts | summary.js | caught (1 failing) | `partial failure: postCount null, an errors entry, totals skip the failed user` |

## What I learned

- `fetch` only rejects when there is **no answer at all**. A 404 or 500 is
  still a "successful" fetch, so `response.ok` has to be checked every time.
- Not every error deserves a retry. A 503 or a timeout may go away by itself;
  a 404, a 400 or broken JSON will not, and retrying them only wastes time.
- `await` inside a loop runs things one after another. To run things at the
  same time, start all the promises first and then `await Promise.all(...)`
  or `Promise.allSettled(...)`.
- `Promise.allSettled` is the right tool when partial results are still
  useful: one failed user should not throw away the other nine.
- Passing in `fetchFn` and `sleep` makes slow, network-dependent code fully
  testable: 63 tests run offline in about a quarter of a second.
- Writing to a temp file and renaming it means a crash can never leave a
  half-written JSON file.
- `??` and `||` are different: `0 ?? 500` is `0`, but `0 || 500` is `500`.
  For `Retry-After: 0` that difference matters.

## Trickiest part

The timeout. It is easy to think of it as a timeout around `fetch` only, but
the body is downloaded **after** `fetch` resolves, so a server that sends the
headers and then stalls could still hang. Putting `response.text()` inside the same `try`
as `fetch` and using one `AbortSignal.timeout` per attempt covers both parts.
A **new** signal is needed for every attempt; one shared signal would already
be aborted on the second try. Testing it without really waiting 5 seconds was
the other half: the fake fetch never answers and only rejects when the signal
fires, with `timeoutMs: 20`.

---

## For the status meeting

**Question:** Promise.all vs awaiting one by one?

**Answer:** When I `await` requests one by one, each one starts only after
the previous one finishes, so in my demo 3 requests of 300 ms took 900 ms;
with `Promise.all` they all start together and it took 300 ms, the time of the
slowest one. The catch is that `Promise.all` rejects as soon as one request
fails, so in the demo the failed "posts" request also threw away the user and
comments data. For independent requests where partial data is still useful I
use `Promise.allSettled`, which also took 300 ms but gave me 2 results and 1
error, and that is what my script uses for the 10 users' posts. I only await
one by one when a request needs the previous result, like loading the users
before I know which ids to ask posts for.
