# Day 08 - TypeScript: types, interfaces, unions, generics, narrowing

Day 8 is my Day 6 script (fetch users and their posts with retry, build a summary, save it as JSON)
**converted to TypeScript with strict mode on and no `any`**. The behaviour and the output JSON are the
same as Day 6. Converting it showed 3 real bugs in the Day 6 JavaScript (see
[Bugs TypeScript caught](#bugs-typescript-caught)).

**Day 6 is the frozen original; Day 8 moved on.** `day-06/` is not the same as this folder any
more: after the conversion, Day 8 (and Day 6, in its own review) got `Retry-After` for 429 and 503
(seconds or an HTTP date), jitter on the backoff, and injectable `random` and `now`. Both folders
have these changes now, but they are two separate copies, and further changes in Day 8 (TypeScript)
are not copied back to Day 6. Day 8 is a converted copy that keeps growing.

## How to run

```bash
cd day-08
npm install
npm run typecheck
npm test
npm start
```

| Command | What it does |
| --- | --- |
| `npm install` | Installs the 2 dev dependencies: `typescript` and `@types/node` |
| `npm run typecheck` | Runs `tsc --noEmit`: checks every type, writes no files |
| `npm test` | Compiles to `dist/`, then runs `node --test dist/tests/*.test.js` (72 tests, no internet) |
| `npm start` | Compiles, then runs `dist/src/main.js`: fetches real data and writes `output/users-summary.json` (needs internet) |

The 3 small demo scripts from Day 6 are also converted. After `npm run build` they run with
`node dist/src/01-promise-basics.js` (and `02-...`, `03-...`). Their output is the same as Day 6, line for line.

| File | What it is |
| --- | --- |
| `src/config.ts` | The one config object (base URL, retry numbers, output path), `readonly` with `as const` |
| `src/guards.ts` | Small type guard helpers used everywhere: `isUnknownArray`, `isObject`, `messageOf` |
| `src/fetch-with-retry.ts` | `fetchJsonWithRetry`: fetch + timeout + retry + backoff + Retry-After, with option checks, Retry-After (429/503), jitter |
| `src/summary.ts` | The data interfaces, `validateUsers` (unknown → `ApiUser[]`) and `buildSummary` |
| `src/save-json.ts` | `saveJson`: writes a temp file, then renames it, so a half-written file is never left |
| `src/main.ts` | The script: users → posts in parallel → summary → save. Exit code 0, 1 or 2 |
| `src/01-promise-basics.ts` | Demo: promise states, `.then` vs `await`, `finally` |
| `src/02-promise-all-vs-sequential.ts` | Demo: one by one vs `Promise.all` vs `Promise.allSettled` (uses a generic `timed<T>`) |
| `src/03-retry-demo.ts` | Demo: retry with a scripted fake `fetch` |
| `tests/fetch-with-retry.test.ts` | Tests for retry, backoff, Retry-After, timeouts, option checks |
| `tests/summary.test.ts` | Tests for `validateUsers`, `isApiUser`, `buildSummary` |
| `tests/save-json.test.ts` | Tests for `saveJson` |
| `tests/source.test.ts` | Fails if `any`, `@ts-ignore`, `as` assertions or `!` appear in `src/` or `tests/` |
| `tsconfig.json` | Compiler settings (strict mode and the extra checks) |
| `output/users-summary.json` | Written by `npm start` |

Exit codes of `main.js` are the same as Day 6: `0` all good, `1` users could not be loaded,
`2` users loaded but posts failed for some users.

## Requirements

- **Node.js 22 or newer** (`"engines": { "node": ">=22" }`). I used Node 24.22.1. Node 22+ is needed for
  `import.meta.dirname`, `URL.canParse` and the glob in `node --test dist/tests/*.test.js`.
- **TypeScript 7.0.2** and **@types/node 26.6.6** (dev dependencies only, nothing runs in production with them).
- **Internet only for `npm start`.** `npm test` and the demos use fake `fetch` functions, so they run offline.
- **No `.env`, no secrets.** The API (`jsonplaceholder.typicode.com`) is public and needs no key.
- `dist/` and `node_modules/` are not committed: the root `.gitignore` already ignores both.

## What TypeScript is and why I used it

**What:** TypeScript is JavaScript plus **types**. A type says what a value is allowed to be: a `number`,
a `string`, an object with an `id` and a `name`, and so on.

**Why:**

1. **It finds bugs before the code runs.** `tsc` reads the whole project and complains when, for example,
   a value can be `null` but I use it as a number. In Day 6 I only found such bugs if a test or a real run
   hit them. Converting Day 6 found 3 bugs that no test had found.
2. **Autocomplete and safer renames.** VS Code knows that `summary.users[0]` has `postCount`, so it suggests it,
   and a typo like `user.nmae` turns red at once.
3. **The types are documentation.** `postCount: number | null` says "this can be missing" without reading the code.

**How it runs:** Node does not run my `.ts` files. `tsc` (the TypeScript compiler) checks the types and then
writes plain `.js` files into `dist/` (`src/main.ts` → `dist/src/main.js`). **The types are removed** in that
step, so `dist/` is normal JavaScript, almost the same as my Day 6 code. `npm start` and `npm test` always run
`tsc` first, and `noEmitOnError` stops them if there is any type error.

## The concepts, one by one

For each one: **what** it is, **why** I used it here, **where** it is in my code, and where it shows up in real
React / Next.js apps.

### Type annotations

- **What:** writing the type yourself after a `:`, like `count: number` or `(): Promise<string>`.
- **Why here:** on every function's parameters and return value, so the input and the output are checked
  where the function is used.
- **Where:** `readNumber` in [src/fetch-with-retry.ts:53](src/fetch-with-retry.ts#L53),
  `saveJson` in [src/save-json.ts:26](src/save-json.ts#L26).
- **Real apps:** the props of a React component, for example `function Avatar({ url }: { url: string })`.

### Type inference

- **What:** TypeScript works out the type by itself when it is clear, so I do not write it.
- **Why here:** local variables stay short. Only function edges are annotated.
- **Where:** `const settings = resolveOptions(url, options)` is `Settings` without a label
  ([src/fetch-with-retry.ts:200](src/fetch-with-retry.ts#L200)). `counts` is `number[]` because the filter
  `count !== null` removes `null` ([src/summary.ts:133](src/summary.ts#L133)).
- **Real apps:** `const [count, setCount] = useState(0)`: React infers `count` is a `number`.

### Interfaces

- **What:** a named description of an object's shape: which keys it has and the type of each.
- **Why here:** the data moves between files (API → validation → summary → JSON file). One shared shape
  means every file agrees on it.
- **Where:** `ApiUser` (what the API sends, [src/summary.ts:4](src/summary.ts#L4)), `UserRow`
  ([src/summary.ts:12](src/summary.ts#L12)), `SummaryError` ([src/summary.ts:21](src/summary.ts#L21)),
  `UsersSummary` ([src/summary.ts:26](src/summary.ts#L26)), `RetryInfo`
  ([src/fetch-with-retry.ts:5](src/fetch-with-retry.ts#L5)), `RetryOptions`
  ([src/fetch-with-retry.ts:17](src/fetch-with-retry.ts#L17)).
- **Unusual line:** in `ApiUser`, `email`, `address` and `company` are `unknown`, not `string`, because
  `validateUsers` only checks `id` and `name`. Saying `email: string` would be a lie the compiler believes.
- **Real apps:** the shape of an API response, or `interface ButtonProps { label: string; onClick: () => void }`.

### Union types

- **What:** "this OR that", written with `|`. `number | null` means a number or `null`.
- **Why here:** a user's post count is missing when their posts request failed. The union forces every
  reader to handle `null` first.
- **Where:** `postCount: number | null` ([src/summary.ts:18](src/summary.ts#L18)). `PostsOutcome` is a union
  of two object shapes, either a count or an error ([src/summary.ts:36](src/summary.ts#L36)). `RetryableStatus`
  is the union `408 | 429 | 500 | 502 | 503 | 504`, built from the array
  ([src/fetch-with-retry.ts:32-33](src/fetch-with-retry.ts#L32-L33)).
- **Real apps:** `data: User | undefined` while a fetch is loading, `error: string | null` in a form.

### Literal types

- **What:** a type that is one exact value: `"rejected"`, `0`, `"maxAttempts"`. A union of literals is a fixed
  list of allowed values.
- **Why here:** option names in error messages can only be real option names, and `main()` can only
  return the 3 exit codes.
- **Where:** `NumberOption` and `FunctionOption` ([src/fetch-with-retry.ts:29-30](src/fetch-with-retry.ts#L29-L30)),
  `ExitCode` = `0 | 1 | 2` ([src/main.ts:11](src/main.ts#L11)). The `"fulfilled" | "rejected"` status of
  `PromiseSettledResult` is what lets [src/summary.ts:97](src/summary.ts#L97) narrow.
- **Real apps:** `variant: "primary" | "secondary"` on a button, `method: "GET" | "POST"`.

### Narrowing

- **What:** a check that TypeScript understands. After the check, inside the `if`, the type is smaller.
- **Why here:** API data starts as `unknown`. Each check makes it a bit more specific until it is an `ApiUser`.
- **Where (one of each kind):**
  - `typeof`: `typeof value === "number"` ([src/summary.ts:43](src/summary.ts#L43))
  - `Array.isArray`: through `isUnknownArray` ([src/guards.ts:1](src/guards.ts#L1)) used in
    [src/summary.ts:73](src/summary.ts#L73)
  - `instanceof Error`: `messageOf` ([src/guards.ts:6](src/guards.ts#L6)) and the timeout check
    ([src/fetch-with-retry.ts:156](src/fetch-with-retry.ts#L156)); `instanceof RequestError`
    ([src/fetch-with-retry.ts:195](src/fetch-with-retry.ts#L195))
  - `in`: `"id" in user` ([src/summary.ts:52](src/summary.ts#L52)), `"postCount" in outcome`
    ([src/summary.ts:116](src/summary.ts#L116)), `"maxAttempts" in options`
    ([src/fetch-with-retry.ts:82](src/fetch-with-retry.ts#L82))
  - `=== null` / `=== undefined`: [src/summary.ts:96](src/summary.ts#L96) and
    [src/summary.ts:122](src/summary.ts#L122)
- **Real apps:** `if (!user) return <Spinner />` and after it `user.name` is safe;
  `if (error instanceof Error)` in a `catch`.

### Type guards (`value is X`)

- **What:** a function that returns `boolean`, with the return type `value is X`. When it returns `true`,
  TypeScript treats the value as `X`.
- **Why here:** to reuse a check in many places, and to turn `unknown` into a typed value **without casting**.
- **Where:** `isApiUser` ([src/summary.ts:61](src/summary.ts#L61)) uses the same `userProblems` checks as
  the error messages, so the guard and the messages can never disagree. `validateUsers` returns
  `users.filter(isApiUser)` ([src/summary.ts:77](src/summary.ts#L77)): `filter` with a type guard gives
  `ApiUser[]`. Also `isWholeNumber`, `isNonBlankString` ([src/summary.ts:43-45](src/summary.ts#L43-L45)),
  `isObject` ([src/guards.ts:3](src/guards.ts#L3)), `isRetryableStatus`
  ([src/fetch-with-retry.ts:37](src/fetch-with-retry.ts#L37)).
- **Real apps:** checking a `fetch` response in a Next.js route handler before using it.

### Generics

- **What:** a type with a "slot", written with `<>`. `Promise<string>` is a promise of a string.
  `PromiseSettledResult<T>` works for any `T`.
- **Why here:**
  - `fetchJsonWithRetry` returns `Promise<unknown>` ([src/fetch-with-retry.ts:199](src/fetch-with-retry.ts#L199)).
    I did **not** make it `fetchJsonWithRetry<T>()`: that would let a caller write `<ApiUser[]>` and get
    a type nobody checked. API data is `unknown` until a guard checks it.
  - The posts results are `PromiseSettledResult<unknown>[]` ([src/main.ts:25](src/main.ts#L25),
    [src/summary.ts:95](src/summary.ts#L95)).
  - My own generic: `timed<T>` ([src/02-promise-all-vs-sequential.ts:16](src/02-promise-all-vs-sequential.ts#L16)) times any task and
    returns `T | null`, so `timed(..., allSettledWithFailure)` keeps the type `PromiseSettledResult<string>[]`.
  - Others: `new Set<number>()` ([src/summary.ts:64](src/summary.ts#L64)), `Map<number, FakeUser>`
    ([src/01-promise-basics.ts:10](src/01-promise-basics.ts#L10)), `Required<RetryOptions>`
    ([src/fetch-with-retry.ts:27](src/fetch-with-retry.ts#L27)).
- **Real apps:** `useState<User | null>(null)`, `Array<T>`, a typed `fetcher<T>` in SWR / React Query.

### `unknown` vs `any`

- **What:** both mean "could be anything". `any` **turns checking off**: you can do anything with it and
  TypeScript says nothing. `unknown` **keeps checking on**: you must narrow it before you use it.
- **Why here:** data from `fetch`, `JSON.parse`, a `catch`, or a rejected promise is really unknown. With
  `unknown` the compiler made me check it, and that is how the 3 bugs were found.
- **Where:** `const data: unknown = JSON.parse(text)` ([src/fetch-with-retry.ts:166](src/fetch-with-retry.ts#L166)),
  `validateUsers(users: unknown)` ([src/summary.ts:72](src/summary.ts#L72)), `messageOf(error: unknown)`
  ([src/guards.ts:6](src/guards.ts#L6)).
- **Unusual line:** `isUnknownArray` ([src/guards.ts:1](src/guards.ts#L1)) wraps `Array.isArray` because the
  built-in returns `any[]`. Using it directly would bring `any` back in.
- **Real apps:** `catch (error)` in any React event handler is `unknown` in strict mode.

### `readonly` and `as const`

- **What:** `readonly` means "cannot be reassigned". `as const` makes a value fully read-only and keeps the
  exact values as literal types (`3`, not `number`).
- **Why here:** there is one config object, and nothing should change it by accident. `Object.freeze` stops
  changes at runtime; `as const` stops them at compile time.
- **Where:** `config` ([src/config.ts:3-10](src/config.ts#L3-L10)); `RETRYABLE_STATUSES ... as const`
  ([src/fetch-with-retry.ts:32](src/fetch-with-retry.ts#L32)); every interface field is `readonly`;
  `buildSummary` takes `readonly ApiUser[]` ([src/summary.ts:127](src/summary.ts#L127)), so it promises not to
  change the caller's array.
- **Real apps:** React props are read-only; route lists and theme tokens are often `as const`.

### Strict mode and each `tsconfig.json` option

| Option | What it does | Where it mattered in my code |
| --- | --- | --- |
| `strict` ([tsconfig.json:3](tsconfig.json#L3)) | Turns on all strict checks, including `strictNullChecks` (`null` is its own type) and `noImplicitAny` (a missing type is an error, not `any`) | Every `null` check on `postCount`; every parameter needed a type |
| `noUncheckedIndexedAccess` ([tsconfig.json:4](tsconfig.json#L4)) | `array[i]` has type `T \| undefined`, because the index might be past the end | `postResults[index]` ([src/summary.ts:132](src/summary.ts#L132)) is `... \| undefined`, so `postCountOf` handles it ([src/summary.ts:96](src/summary.ts#L96)); `steps[calls]` in the demo ([src/03-retry-demo.ts:22](src/03-retry-demo.ts#L22)) |
| `noImplicitReturns` ([tsconfig.json:5](tsconfig.json#L5)) | Every path of a function that returns something must return or throw | `requestText` ends with `throw httpError(response)` ([src/fetch-with-retry.ts:173](src/fetch-with-retry.ts#L173)) |
| `noFallthroughCasesInSwitch` ([tsconfig.json:6](tsconfig.json#L6)) | A `case` without `break`/`return` is an error | My code has no `switch`; it is on as a safety net |
| `noUnusedLocals` / `noUnusedParameters` ([tsconfig.json:7-8](tsconfig.json#L7-L8)) | Unused variables or parameters are errors | Old Day 6 leftovers like `let lastError` could not stay after I rewrote the loop |
| `useUnknownInCatchVariables` ([tsconfig.json:9](tsconfig.json#L9)) | `catch (error)` gives `error: unknown` (already part of `strict`, written out to be clear) | 7 of the first 14 errors; every `catch` now uses `messageOf(error)` or `instanceof` |
| `noEmitOnError` ([tsconfig.json:10](tsconfig.json#L10)) | If there is a type error, `tsc` writes no `.js` files | `npm start` / `npm test` cannot run code that does not type-check |
| `module` / `moduleResolution: "nodenext"` ([tsconfig.json:11-12](tsconfig.json#L11-L12)) | Follow Node's real ES module rules | Imports must end in `.js` (`import { config } from "./config.js"`), because that is the file Node loads from `dist/` |
| `target: "es2022"` ([tsconfig.json:13](tsconfig.json#L13)) | Which JavaScript version to write | Keeps top-level `await` in `main.ts` and `Error` `cause` as they are |
| `outDir` / `rootDir` ([tsconfig.json:14-15](tsconfig.json#L14-L15)) | Write to `dist/`, keep the folder layout from `.` | `src/main.ts` → `dist/src/main.js`, `tests/x.test.ts` → `dist/tests/x.test.js` |
| `types: ["node"]` ([tsconfig.json:16](tsconfig.json#L16)) | Load the Node types (`process`, `fetch`, `Response`, `node:fs`) | Needed because TypeScript 7 does not load `@types/*` by default any more |

## Conditions: what the types do NOT do

1. **Types are removed when compiled.** `dist/src/summary.js` has no `ApiUser` in it. Types protect the code
   while I write it, not while it runs.
2. **JSON from `fetch` is not checked by types.** If the API sends `{ "id": "1" }`, no type stops it at
   runtime. That is why `fetchJsonWithRetry` returns `unknown` and `validateUsers` still checks every user
   at runtime, like in Day 6. If I wrote `as ApiUser[]` instead, the code would compile and then fail on bad data.
3. **Strict mode only checks what it can see.** The standard library itself has some `any`, and strict mode
   does not complain about it. I checked these with `tsc --strict`: `JSON.parse` returns `any`,
   `Array.isArray` narrows to `any[]`, `PromiseRejectedResult.reason` is `any`, and `.catch((error) => ...)`
   gets `any`. One of these `any`s **hid a real bug** (bug 3 below). I replaced each one with `unknown`
   (`isUnknownArray`, `messageOf`, `(error: unknown) =>`).
4. **The types can also be wrong.** `JSON.stringify` is typed as returning `string`, but it really returns
   `undefined` for `undefined`, a function or a symbol. So `toJsonText` stores it as `string | undefined`
   ([src/save-json.ts:7](src/save-json.ts#L7)) and still checks it.
5. **Runtime checks for JavaScript callers stay.** The options are typed, but `resolveOptions(url: unknown,
   options: unknown)` still checks them at runtime, because a plain JS caller (or JSON config) is not
   type-checked.

## JavaScript vs TypeScript

The Day 6 snippets below are the code as it was when I converted it (commit `4c11102`); the links go to
that exact version. After Day 8 I fixed the three bugs in Day 6 as well, with a test for each.

### 1. Collecting the errors (bug 3)

Day 6 ([day-06/summary.js:85](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/summary.js#L85)):

```js
    errors: rows.filter((row) => row.error).map((row) => ({ userId: row.user.id, message: row.error })),
```

Day 8 ([src/summary.ts:121-122](src/summary.ts#L121-L122)):

```ts
const toSummaryErrors = (rows: readonly RowResult[]): SummaryError[] =>
  rows.flatMap(({ user, error }) => (error === null ? [] : [{ userId: user.id, message: error }]));
```

Day 6 kept a row only if `row.error` was **truthy**, so an empty message `""` was dropped. Day 8 checks
`=== null`, which is what "no error" really means here.

### 2. The network error message (bug 1)

Day 6 ([day-06/fetch-with-retry.js:81-84](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/fetch-with-retry.js#L81-L84)):

```js
function networkError(error, timeoutMs) {
  const reason = error?.name === "TimeoutError" ? `timeout after ${timeoutMs} ms` : `network error: ${error?.message}`;
  return requestError(reason, { retryable: true, cause: error });
}
```

Day 8 ([src/fetch-with-retry.ts:155-159](src/fetch-with-retry.ts#L155-L159)):

```ts
function networkError(error: unknown, timeoutMs: number): RequestError {
  const isTimeout = error instanceof Error && error.name === "TimeoutError";
  const reason = isTimeout ? `timeout after ${timeoutMs} ms` : `network error: ${messageOf(error)}`;
  return new RequestError(reason, { retryable: true, cause: error });
}
```

Day 6 used `error?.message`, which gives `undefined` when the thrown value is not an `Error`. Day 8 checks
with `instanceof Error` first. Day 6 also built its errors with a `requestError(...)` helper function. Day 8
uses a `RequestError` class instead, so the retry loop can check `error instanceof RequestError`
([src/fetch-with-retry.ts:195](src/fetch-with-retry.ts#L195)).

### 3. Validating users: unknown in, `ApiUser[]` out

Day 6 ([day-06/summary.js:26-36](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/summary.js#L26-L36)):

```js
export function validateUsers(users) {
  if (!Array.isArray(users)) {
    throw new TypeError(`users must be an array, got ${users === null ? "null" : typeof users}`);
  }
  const problems = users.flatMap(userProblems);
  if (problems.length === 0) problems.push(...duplicateIdProblems(users));
  if (problems.length > 0) {
    throw new TypeError(`Invalid users:\n- ${problems.join("\n- ")}`);
  }
  return users;
}
```

Day 8 ([src/summary.ts:72-83](src/summary.ts#L72-L83)):

```ts
export function validateUsers(users: unknown): ApiUser[] {
  if (!isUnknownArray(users)) {
    throw new TypeError(`users must be an array, got ${users === null ? "null" : typeof users}`);
  }
  const problems = users.flatMap(userProblems);
  const validUsers = users.filter(isApiUser);
  if (problems.length === 0) problems.push(...duplicateIdProblems(validUsers));
  if (problems.length > 0) {
    throw new TypeError(`Invalid users:\n- ${problems.join("\n- ")}`);
  }
  return validUsers;
}
```

The checks are the same. The difference is that `users.filter(isApiUser)` **proves** to the compiler that
every item is an `ApiUser`, so there is no cast. When there are no problems, `validUsers` holds the same
objects as `users` (the test "returns the same user objects, extra API fields kept" checks this).

## Bugs TypeScript caught

**Update:** all three bugs below are now also fixed in `day-06/`, and each has its own Day 6 test
(`still gives a readable reason`, `email, city or company that are not strings become null`,
`a failure with an empty message is still listed in errors`). The Day 6 line numbers here point to the
version before that fix.

When I started, `npm run typecheck` showed **14 errors**. Then 1 more appeared once I removed a hidden `any`.
I ran the **unchanged Day 6 code** with bad input to check each one. **6 of the 15 errors point to 3 real
bugs** (wrong output, no crash). The other 9 were TypeScript not being able to see that the code was already
safe.

### The real bugs

**Bug 1. A thrown value that is not an `Error` gives "network error: undefined"**

- **tsc:** `src/fetch-with-retry.ts(156,110): error TS2339: Property 'message' does not exist on type '{}'.`
  (and `(156,25)` for `name`)
- **Day 6:** [day-06/fetch-with-retry.js:82](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/fetch-with-retry.js#L82), `error?.message`
- **Why it is real:** JavaScript can `throw` anything, not only an `Error`. Running Day 6 with
  `fetchFn: async () => { throw "offline"; }` printed
  `GET https://a.test/x failed after 1 attempt. Last reason: network error: undefined`. The real reason
  ("offline") is lost. The real `fetch` always throws an `Error`, so this only happens with an injected
  `fetchFn`, which Day 6 allows on purpose.
- **Fix:** `messageOf(error)` (uses `.message` for an `Error`, `String(error)` for anything else) and
  `error instanceof Error` for the timeout check. Test: "a thrown value that is not an Error still gives a
  readable reason".

**Bug 2. `email`, `city` and `company` were copied without checking their type**

- **tsc:** `src/summary.ts(92,5): error TS2322: Type '{} | null' is not assignable to type 'string | null'.`
  plus `TS2339: Property 'city' does not exist on type '{}'.` (93,25) and `Property 'name' ...` (94,28)
- **Day 6:** [day-06/summary.js:61-63](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/summary.js#L61-L63), `email: user.email ?? null` etc.
- **Why it is real:** `validateUsers` only checks `id` and `name`. Running Day 6 with
  `email: 42, address: { city: ["x"] }, company: { name: {} }` saved
  `{"id":1,"name":"A","email":42,"city":["x"],"company":{},"postCount":0}`. The output says these are
  strings or `null`, but it wrote a number, an array and an object.
- **Fix:** `stringOrNull`, `cityOf`, `companyNameOf` ([src/summary.ts:47](src/summary.ts#L47),
  [src/summary.ts:102](src/summary.ts#L102)): a non-string becomes `null`. For the real API data the result is
  the same (checked below). Test: "email, city or company that are not strings become null".

**Bug 3. A failed posts request with an empty message was left out of `errors`**

- **tsc:** this one was hidden. In the first version `result.reason` is typed `any`, so the `error` field was
  `any` and tsc said nothing. After I replaced it with `messageOf(result.reason)` (a real `string`), tsc said:
  `src/summary.ts(120,5): error TS2322: Type '{ userId: number; message: string | undefined; }[]' is not
  assignable to type 'readonly SummaryError[]'.`
- **Day 6:** [day-06/summary.js:85](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/summary.js#L85), `rows.filter((row) => row.error)`
- **Why it is real:** the filter keeps only *truthy* errors, and `""` is falsy. Running Day 6 with a posts
  result `{ status: "rejected", reason: new Error("") }` gave `postCount: null` but `"errors": []`. So the
  summary says nothing failed, and `main.js` would exit with `0` instead of `2`. In `main.js` today the
  messages from `fetchJsonWithRetry` are never empty, so it needs another caller of `buildSummary` to happen.
- **Fix:** `error` is `string | null` and the filter checks `error === null` ([src/summary.ts:122](src/summary.ts#L122)).
  Test: "a failure with an empty message is still listed in errors".

### The errors that were not real bugs

| tsc error | Where | Why it was not a bug |
| --- | --- | --- |
| `TS2345: Argument of type 'string \| undefined' is not assignable to parameter of type 'string'` | `parseJson(text)`, [day-06/fetch-with-retry.js:107](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/fetch-with-retry.js#L107) | `text` is always set when we get there (a non-ok response throws first). tsc cannot follow that, so I split out `requestText`, which returns a `string` |
| `TS18046: 'error' is of type 'unknown'` (×3) and `TS2345` (×1) | the retry loop, [day-06/fetch-with-retry.js:125-134](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/fetch-with-retry.js#L125-L134) | Only `RequestError`s reach that `catch`, and a missing `retryable` was already treated as "not retried". Now `retryableOrThrow` checks `instanceof RequestError` |
| `TS18046: 'lastError' is of type 'unknown'` | [day-06/fetch-with-retry.js:137](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/fetch-with-retry.js#L137) | `maxAttempts` is at least 1, so `lastError` was always set. The new loop throws from inside, so `lastError` is gone |
| `TS18046: 'user' is of type 'unknown'` (×3) | `userProblems`, [day-06/summary.js:5-15](https://github.com/Ibad2004/javascript/blob/4c11102/day-06/summary.js#L5-L15) | Day 6 already checked these at runtime; `isPlainObject` just was not a type guard. Now `isObject` + `in` |

Strict mode also asked for 2 checks in the demo scripts, also not bugs: `'settled' is possibly 'null'`
(`Promise.allSettled` never rejects) and `Cannot invoke an object which is possibly 'undefined'` for
`steps[calls]` (each demo gives enough steps).

## Edge cases

Same behaviour as Day 6, plus the 3 bug fixes. Every row has a test.

| Edge case | Result | Test |
| --- | --- | --- |
| Empty users list | average `0`, not `NaN` | "empty users gives average 0, not NaN" |
| Every user's posts failed | average `0`, all users in `errors` | "every user failed: average 0, all in errors" |
| A user with 0 posts | counts as `0`, not as an error | "a user with 0 posts counts as 0, not as an error" |
| Posts failed for one user | `postCount: null`, one `errors` entry, totals skip that user | "partial failure: postCount null, an errors entry, totals skip the failed user" |
| Failure with an empty message (bug 3) | still listed in `errors` | "a failure with an empty message is still listed in errors" |
| Rejection reason is a string | message is that string | "a rejection reason that is not an Error still gives a message" |
| Posts response is not an array | becomes an error | "a posts response that is not an array becomes an error" |
| No email / address / company | `null` | "missing email, address or company become null" |
| email / city / company not strings (bug 2) | `null` | "email, city or company that are not strings become null" |
| Users not an array; bad id; blank name; non-object item; repeated id | `TypeError` that lists every problem | the `validateUsers` tests, e.g. "lists every problem in one error" |
| 408, 429, 500, 502, 503, 504 | retried | "retries every retryable status: 408, 429, 500, 502, 503, 504" |
| 400, 401, 403, 404, 422 | not retried | "400 is not retried" … "422 is not retried" |
| Invalid JSON / empty body | not retried, clear error | "invalid JSON is not retried", "an empty or blank body gives a clear error" |
| Body is `null`, `0` or `false` | returned, not "empty" | "valid JSON null, 0 and false are returned, not treated as empty" |
| A thrown value that is not an `Error` (bug 1) | reason uses `String(value)` | "a thrown value that is not an Error still gives a readable reason" |
| Timeout | reported as `timeout after N ms`, retried | "timeout then 200: a TimeoutError is reported as a timeout and retried" |
| Backoff | 500, 1000, 2000, 4000, capped at `maxDelayMs` | "delays double each time: 500, 1000, 2000, 4000", "delays are capped at maxDelayMs" |
| Retry-After on 429 and 503 | seconds or HTTP date honoured, capped; past date = 0; bad values use backoff; ignored on other statuses | the "429 and Retry-After" tests |
| Jitter | half of the backoff fixed, half random; `random` is injectable; not applied to Retry-After; capped | the 6 "jitter" tests |
| Bad options (`maxAttempts` 0 / 11 / 1.5 / `"3"` / `NaN`, bad url, non-function `fetchFn`, …) | `TypeError` / `RangeError` before any fetch | the 12 "option validation" tests |
| Circular data, `undefined`, function, symbol, BigInt | `TypeError`, nothing written | "rejects circular data with a clear TypeError and writes nothing", "rejects undefined, a function, a symbol and a BigInt" |
| Blank or non-string file path | `TypeError` | "rejects a blank file path", "rejects a file path that is not a string" |

The tests never wait for real time. `sleep` is a fake that only records the delay. A timeout is simulated by
throwing the same `DOMException` named `TimeoutError` that `AbortSignal.timeout` produces. (Day 6's tests
waited 10-20 ms for a real `AbortSignal.timeout`, and `node:test`'s mock timers cannot fake that one.)

## Real output

`npm run typecheck` printed nothing and exited with 0 (0 errors).

`npm test` (run 2 times, both the same):

```text
ℹ tests 72
ℹ suites 10
ℹ pass 72
ℹ fail 0
```

`npm start`:

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
Saved to output\users-summary.json
```

I compared `day-08/output/users-summary.json` with `day-06/output/users-summary.json` after removing
`fetchedAt` from both: **they are identical** (same keys, same order, same values).

### Proof that the types work

I made 3 mistakes on purpose, ran `npm run typecheck`, and then undid them:

| Mistake | tsc error |
| --- | --- |
| `maxAttempts: "3"` in `loadUsers` | `src/main.ts(22,84): error TS2322: Type 'string' is not assignable to type 'number'.` |
| `name: user.nmae` in `toUserRow` | `src/summary.ts(112,16): error TS2339: Property 'nmae' does not exist on type 'ApiUser'.` |
| `user.postCount.toFixed(0)` without the `null` check in `printSummary` | `src/main.ts(36,22): error TS18047: 'user.postCount' is possibly 'null'.` |

## What broke and how I fixed it

1. **`npm test` failed: "Cannot find module '...\day-08\dist\tests'".** The planned script was
   `node --test dist/tests/`. On Node 24, a folder given to `node --test` is run as one file, not searched.
   **Fix:** `node --test dist/tests/*.test.js`. Node 22+ expands the glob itself, so it works the same in
   PowerShell, cmd and bash.
2. **My own source test failed on `import { setTimeout as delay }`.** The "no `as` assertions" rule matched
   the `as` of an import rename, which is not a type assertion. **Fix:** the rule skips `import` lines, and
   the test "allowed code is not flagged" now includes that line, so the rule cannot break it again.
3. **The Day 6 tests did not compile.** They pass wrong values on purpose (`maxAttempts: "3"`,
   `saveJson(42, {})`, `buildSummary(null, ...)`) to test the runtime checks, and TypeScript rejects those calls.
   Casting them would break the "no assertions" rule. **Fix:** the runtime checks take `unknown`
   (`resolveOptions`, `checkFilePath`, `checkSummaryArgs`), so those tests call the check directly. Values that
   are the right type but the wrong size (`maxAttempts: 0`, `"not a url"`) still go through
   `fetchJsonWithRetry` and also check that `fetch` was never called.
4. **The first type errors hid a bug.** `result.reason` is `any`, so tsc did not report the `errors` filter
   until I replaced it. See bug 3.

## What I learned

- `unknown` is the honest type for anything from outside (API, `JSON.parse`, `catch`). `any` just turns the
  checks off, and the standard library hands out `any` in places where strict mode does not warn.
- A type guard (`value is ApiUser`) is how runtime checks and types work together. The check runs, and the
  compiler trusts the result.
- `noUncheckedIndexedAccess` is not on with `strict`, but it is the one that makes `array[i]` honest.
- Types disappear when compiled, so validation of outside data is still needed. Types do not replace it.
- Most type errors were not bugs. They showed places where the code was safe for a reason the compiler could
  not see. Rewriting those places to make the reason visible also made the code easier to read.

## Trickiest part

Converting without one cast. The easy way is `return users as ApiUser[]`, and it compiles. But then the type
claims something nobody checked. Getting from `unknown` to `ApiUser[]` needed `isUnknownArray` (because
`Array.isArray` gives `any[]`), `isObject` + `in` to read `user.id` safely, and `users.filter(isApiUser)`
so the compiler sees the proof. The same `any` problem in `PromiseRejectedResult.reason` was what hid bug 3.

## For the status meeting

**"One place where TypeScript caught a real bug":** In Day 6, `buildSummary` collects failed users with
`rows.filter((row) => row.error)`. That drops any failure whose message is an empty string, so the summary
could say "no errors" and the script would exit 0 even though a user's posts failed. TypeScript did not see
it at first, because `PromiseRejectedResult.reason` is typed `any`. Once I replaced that with `unknown` and a
`messageOf` helper, tsc reported `TS2322: message: string | undefined is not assignable to string` on that
exact line, and the fix was to check `error === null` instead of truthiness. I proved it by running the
unchanged Day 6 code with an empty error message (it gave `"errors": []`), and there is now a test for it.
