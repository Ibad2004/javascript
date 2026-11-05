# Day 09: npm, package.json scripts, ESLint, Prettier

An expense-tracker CLI in strict TypeScript. It reads and writes `data/expenses.json`, and every quality check
runs from one `npm run check`.

## Requirements

- Node.js 22 or newer (`"engines": { "node": ">=22" }`)
- Run `npm install` once inside `day-09/`

## How to run

All commands run from `day-09/`. `npm start` builds first (the `prestart` script), then runs the CLI.

| Command                                  | Example                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `add <amount> <description> [category]`  | `npm start -- add 450 "Lunch with team" food`   |
| `list [category]`                        | `npm start -- list` or `npm start -- list food` |
| `total`                                  | `npm start -- total`                            |
| `delete <id>`                            | `npm start -- delete 2`                         |
| `help` (also: no command, unknown → `1`) | `npm start -- help`                             |

- Category defaults to `other` and is trimmed and lowercased (`" Food "` → `food`).
- Amount must be a positive number with at most 2 decimals. Totals are added in whole paisa.
- Quote a description that has spaces. Exit code is `0` on success, `1` on bad input.
- Data lives in `data/expenses.json` (git-ignored, created on the first `add`). `expenses.example.json` shows
  the shape. Set `EXPENSES_FILE` to use another file (the CLI tests do this).

## npm and the package.json scripts

npm installs the dev tools listed in `devDependencies` into `node_modules/` and pins exact versions in
`package-lock.json`. `"type": "module"` makes `.js` files ES modules, `"private": true` stops an accidental
`npm publish`. `npm run <name>` runs a script with `node_modules/.bin` on the PATH, so `tsc`, `eslint` and
`prettier` work without a global install.

| Script         | Command                                                                 | Why                                                         |
| -------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| `build`        | `tsc`                                                                   | Compile `src/` and `tests/` into `dist/`                    |
| `prestart`     | `npm run build`                                                         | npm runs it before `start` automatically                    |
| `start`        | `node dist/src/cli.js`                                                  | Run the CLI on freshly built code                           |
| `test`         | `npm run build && node --test dist/tests/*.test.js`                     | Tests run on the compiled JS                                |
| `typecheck`    | `tsc --noEmit`                                                          | Type errors only, no output files                           |
| `lint`         | `eslint .`                                                              | Find code problems                                          |
| `lint:fix`     | `eslint . --fix`                                                        | Auto-fix what ESLint can                                    |
| `format`       | `prettier . --write`                                                    | Rewrite files in the house style                            |
| `format:check` | `prettier . --check`                                                    | Fail if a file is not formatted (for CI)                    |
| `check`        | `npm run typecheck && npm run lint && npm run format:check && npm test` | One command before every commit; stops at the first failure |

## ESLint vs Prettier vs TypeScript

| Tool       | Checks                                       | Real example from this project                                                                                   |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| TypeScript | Types: can this value be `undefined` here?   | With `noUncheckedIndexedAccess`, `rest[0]` is `string \| undefined`, so every parser takes `string \| undefined` |
| ESLint     | Code problems and risky patterns, not types  | `no-floating-promises` flagged every `test(...)` call (see What broke)                                           |
| Prettier   | Layout only: quotes, semicolons, line length | It wrapped the `dataFile` line in `src/config.ts` because it was over 110 characters                             |

`eslint-config-prettier` is last in `eslint.config.js`, so ESLint turns off its style rules and never
disagrees with Prettier. `no-console` is an error everywhere except `src/cli.ts`, the only file allowed to print.

## Project structure

```text
day-09/
├── src/
│   ├── config.ts          one frozen config object: data file path, default category, max decimals
│   ├── expenses.ts        pure logic: parse and validate input, add, delete, filter, totals, formatting
│   ├── storage.ts         file I/O: load (missing → empty, bad JSON/shape → error), safe save, shape check
│   └── cli.ts             parses arguments, calls the functions above, prints, sets the exit code
├── tests/
│   ├── expenses.test.ts   logic tests, no files and no CLI
│   ├── storage.test.ts    load/save tests in a temp folder
│   └── cli.test.ts        runs the built CLI as a child process to check output and exit codes
├── data/expenses.json     real data (git-ignored, created on first add)
├── expenses.example.json  committed sample of the data shape
├── eslint.config.js       ESLint 9 flat config
├── .prettierrc            Prettier style: double quotes, semicolons, printWidth 110
├── .prettierignore        skip dist, node_modules, data, package-lock.json
├── .gitattributes         force LF so format:check passes on Windows checkouts
├── tsconfig.json          same strict settings as Day 8
└── package.json           scripts, engines, dev dependencies
```

Why split it this way: `expenses.ts` has no I/O, so its tests are fast and need no files. `storage.ts` is the
only file that touches the disk, so "never overwrite a bad file" lives in one place. `cli.ts` has no logic,
so swapping the CLI for a web page later would reuse the other two files unchanged.

Data file shape: `{ "nextId": 3, "expenses": [...] }`. `nextId` is stored so an id is never reused, even after
the highest one is deleted:

```ts
const highestId = store.expenses.reduce((max, expense) => Math.max(max, expense.id), 0);
const id = Math.max(store.nextId, highestId + 1);
```

Money is added in whole paisa so `0.1 + 0.2` gives exactly `0.30`:

```ts
export function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}
```

## Edge cases → tests

| Edge case                       | Test                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| amount `0`                      | `rejects amount 0`                                                                                  |
| negative amount                 | `rejects a negative amount`                                                                         |
| `"abc"`                         | `rejects a non-number amount like abc`                                                              |
| `"12.345"`                      | `rejects more than 2 decimals like 12.345`                                                          |
| `Infinity`                      | `rejects Infinity`                                                                                  |
| missing amount                  | `rejects a missing amount`                                                                          |
| empty or blank description      | `rejects an empty or blank description`                                                             |
| category trimmed and lowercased | `trims and lowercases the category and defaults to other`                                           |
| ids never reused                | `never reuses an id after the highest one is deleted`                                               |
| delete id that doesn't exist    | `rejects an id that does not exist`                                                                 |
| delete `"abc"`                  | `rejects a non-number id like abc`                                                                  |
| delete with missing id          | `rejects a missing id`                                                                              |
| list with no expenses           | `list with no expenses says No expenses yet`                                                        |
| total with no expenses          | `total with no expenses is 0.00 and never NaN`                                                      |
| `0.1 + 0.2`                     | `totals use whole paisa so 0.1 + 0.2 is exactly 0.30`                                               |
| missing data file               | `a missing data file starts empty`                                                                  |
| corrupted JSON                  | `corrupted JSON gives a clear error and does not overwrite the file`                                |
| wrong shape                     | `wrong shape in the file gives a clear error`, `rejects a bare array, duplicate ids and a bad date` |
| unknown command                 | `unknown command shows help and exits with code 1`                                                  |
| bad amount from the CLI         | `bad amount exits with code 1 and saves nothing`                                                    |

## What broke and how I fixed it

1. **typescript-eslint did not support TypeScript 7.** Day 8 used `typescript@^7`, but `typescript-eslint`
   8.72 needs `>=4.8.4 <6.1.0`. Fix: pinned `typescript` to `~6.0.0` in this folder.
2. **ESLint flagged every test.** `no-floating-promises` reported 36 errors because `node:test`'s `describe` and
   `test` return promises. Fix: for `tests/**/*.ts` only, mark those calls as known-safe with
   `allowForKnownSafeCalls` instead of turning the rule off.
3. **Descriptions arrived as `^Lunch^ with^ team^`.** The first `start` script was
   `npm run build && node dist/src/cli.js`. On Windows, npm escapes extra arguments with `^` for cmd.exe, and
   running the `npm` batch file before `&&` left those carets in the text. I proved it with a probe script:
   `node -e` alone got `"a b"`, `npm run build && node -e` got `"^a^ b^"`. Fix: moved the build into a
   `prestart` script, so `start` is only `node dist/src/cli.js`. `npm start` still builds first.

## What I learned

- `package.json` scripts are the project's command list: anyone can run `npm run check` without knowing the tools.
- `pre<name>` scripts run automatically before `<name>`.
- TypeScript, ESLint and Prettier overlap very little: types, code problems and layout.
- Validating loaded JSON is as important as validating CLI input; a bad file should stop the program, not be
  overwritten.
- Whole-number paisa avoids floating-point money errors.

## For the status meeting

1. **`src/expenses.ts`** is the core: pure functions that take input and return `{ ok, value }` or
   `{ ok, error }`. Nothing here reads files or prints.
2. **`src/storage.ts`** is the only disk access: missing file → empty list, bad file → clear error and the file
   is left alone, save goes through a temp file and `rename` so a crash can't leave half a file.
3. **`src/cli.ts`** only turns arguments into function calls and results into text and an exit code.
4. **`src/config.ts`** holds every setting in one object.
5. **`tests/`** mirrors that split: logic, storage, and one file that runs the real CLI.
6. **Tooling**: `npm run check` runs typecheck, lint, format check and 29 tests in one go.
