# Day 09: npm, package.json scripts, ESLint, Prettier

An expense-tracker CLI in strict TypeScript. It reads and writes `data/expenses.json`, and every quality check
runs from one `npm run check`.

## Requirements

- Node.js 22 or newer (`"engines": { "node": ">=22" }`)
- Run `npm install` once inside `day-09/`

## How to run

All commands run from `day-09/`. `npm start` builds first (the `prestart` script), then runs the CLI.

| Command                                                           | Example                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `add <amount> <description> [category]`                           | `npm start -- add 450 "Lunch with team" food`                |
| `edit <id> [--amount X] [--description "text"] [--category name]` | `npm start -- edit 2 --amount 150`                           |
| `list [category]`                                                 | `npm start -- list` or `npm start -- list food`              |
| `total [--month YYYY-MM]`                                         | `npm start -- total` or `npm start -- total --month 2026-11` |
| `delete <id>`                                                     | `npm start -- delete 2`                                      |
| `export <file.csv> [--force]`                                     | `npm start -- export expenses.csv`                           |
| `help` (also `--help`, `-h`, no command; unknown → `1`)           | `npm start -- --help`                                        |

- Category defaults to `other` and is trimmed and lowercased (`" Food "` → `food`).
- Amount must be a positive number with at most 2 decimals. Totals are added in whole paisa.
- Quote a description that has spaces. Exit code is `0` on success, `1` on bad input.
- `edit` changes only the fields you give and keeps the id and date. It uses the same rules as `add`, but a
  blank `--category` is an error instead of falling back to `other`. Unknown options, a missing value and the
  same option twice are errors, and the data file is not changed.
- `total --month` uses the month of the saved date **in local time**. A month with no expenses prints
  `No expenses in 2026-12` and `Total: 0.00`.
- `export` writes `id,date,category,amount,description` with `\r\n` line endings. The path is relative to
  `day-09/` (where npm runs the script), and `*.csv` there is git-ignored. Values with commas, quotes or new
  lines are quoted, and quotes are doubled. A cell starting with `=`, `+`, `-`, `@`, tab or carriage return
  gets a leading `'` so a spreadsheet does not run it as a formula. An existing file is never overwritten
  unless you add `--force`.
- Data lives in `data/expenses.json` (git-ignored, created on the first `add`). `expenses.example.json` shows
  the shape. Set `EXPENSES_FILE` to use another file (the CLI tests do this).

Help text (`npm start -- help`):

```text
Usage: npm start -- <command>

Commands:
  add <amount> <description> [category]   Add an expense (category defaults to "other")
  edit <id> [--amount X] [--description "text"] [--category name]
                                          Change only the given fields of an expense
  list [category]                         Show expenses, optionally for one category
  total [--month YYYY-MM]                 Show the overall total and the total per category,
                                          optionally for one month (local time)
  delete <id>                             Delete an expense by id
  export <file.csv> [--force]             Save all expenses as CSV (--force overwrites the file)
  help, --help, -h                        Show this help

Example: npm start -- add 450 "Lunch with team" food
```

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
│   ├── config.ts          one frozen config object: data file, limits, month pattern, CSV rules
│   ├── expenses.ts        pure logic: parse and validate input, add, edit, delete, filter, totals, formatting
│   ├── export.ts          pure CSV logic: escaping, formula protection, file name check
│   ├── storage.ts         file I/O: load (missing → empty, bad JSON/shape → error), safe save, safe export
│   └── cli.ts             parses arguments and options, calls the functions above, prints, sets the exit code
├── tests/
│   ├── expenses.test.ts   logic tests, no files and no CLI
│   ├── export.test.ts     CSV tests, no files
│   ├── storage.test.ts    load/save/export tests in a temp folder
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

| Edge case                                                                   | Test                                                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| amount `0`                                                                  | `rejects amount 0`                                                                                                                  |
| negative amount                                                             | `rejects a negative amount`                                                                                                         |
| `"abc"`                                                                     | `rejects a non-number amount like abc`                                                                                              |
| `"12.345"`                                                                  | `rejects more than 2 decimals like 12.345`                                                                                          |
| `Infinity`                                                                  | `rejects Infinity`                                                                                                                  |
| missing amount                                                              | `rejects a missing amount`                                                                                                          |
| empty or blank description                                                  | `rejects an empty or blank description`                                                                                             |
| category trimmed and lowercased                                             | `trims and lowercases the category and defaults to other`                                                                           |
| ids never reused                                                            | `never reuses an id after the highest one is deleted`                                                                               |
| delete id that doesn't exist                                                | `rejects an id that does not exist`                                                                                                 |
| delete `"abc"`                                                              | `rejects a non-number id like abc`                                                                                                  |
| delete with missing id                                                      | `rejects a missing id`                                                                                                              |
| list with no expenses                                                       | `list with no expenses says No expenses yet`                                                                                        |
| list a category with no expenses                                            | `list for a category with no expenses names that category` (prints `No expenses in category "nope".`)                               |
| amount above 1,000,000,000                                                  | `rejects an amount above the maximum instead of saving a rounded value`                                                             |
| exactly the maximum amount                                                  | `accepts the largest allowed amount exactly`                                                                                        |
| amount above the maximum in the data file                                   | `an amount above the maximum in the file gives a clear error`                                                                       |
| `--help` and `-h`                                                           | `help, --help and -h show help and exit with code 0`                                                                                |
| total with no expenses                                                      | `total with no expenses is 0.00 and never NaN`                                                                                      |
| `0.1 + 0.2`                                                                 | `totals use whole paisa so 0.1 + 0.2 is exactly 0.30`                                                                               |
| missing data file                                                           | `a missing data file starts empty`                                                                                                  |
| corrupted JSON                                                              | `corrupted JSON gives a clear error and does not overwrite the file`                                                                |
| wrong shape                                                                 | `wrong shape in the file gives a clear error`, `rejects a bare array, duplicate ids and a bad date`                                 |
| unknown command                                                             | `unknown command shows help and exits with code 1`                                                                                  |
| bad amount from the CLI                                                     | `bad amount exits with code 1 and saves nothing`                                                                                    |
| edit only the given fields, keep id and date                                | `changes only the given fields and keeps id and date`                                                                               |
| edit category trimmed and lowercased                                        | `trims and lowercases a new category and trims a new description`                                                                   |
| edit with missing / `"abc"` / unknown id                                    | `edit rejects a missing, non-number or unknown id`                                                                                  |
| edit with no fields                                                         | `edit rejects no fields`                                                                                                            |
| edit with invalid new values                                                | `edit rejects invalid new values with the same rules as add`                                                                        |
| edit `--price`, flag without value, flag twice, extra words; file unchanged | `bad edits exit with code 1 and leave the file unchanged`                                                                           |
| `Edited #1: 150.00 Bus fare (transport)`                                    | `edit changes the given field and prints the edited expense`                                                                        |
| month `2026-11` accepted                                                    | `accepts a YYYY-MM month`                                                                                                           |
| month `2026-13`, `2026-1`, `26-11`, `abc`                                   | `rejects 2026-13, 2026-1, 26-11, abc and 2026-00`                                                                                   |
| missing month                                                               | `rejects a missing month`, `total with a bad or missing month exits with code 1`                                                    |
| only that month counted                                                     | `totals only the expenses of that month`                                                                                            |
| month with no expenses                                                      | `a month with no expenses says so and totals 0.00, never NaN`                                                                       |
| `total` without `--month` unchanged                                         | `total --month shows that month and an empty month says so`                                                                         |
| CSV with no expenses                                                        | `no expenses gives the header row only`, `export with no expenses writes the header row and says so`                                |
| CSV amount and date format                                                  | `writes amount with 2 decimals and date as YYYY-MM-DD`                                                                              |
| CSV commas, quotes, new lines                                               | `quotes values with commas, quotes or new lines and doubles quotes`                                                                 |
| CSV injection `= + - @`                                                     | `prefixes cells starting with = + - @ with a quote against CSV injection`, `protects the category column too`                       |
| file name must end with `.csv`                                              | `rejects a missing name, another extension and a bare .csv`                                                                         |
| no overwrite without `--force`                                              | `refuses to overwrite an existing file unless force is set`, `export writes a CSV, refuses to overwrite it, and --force overwrites` |
| bad export arguments                                                        | `export with a bad file name or option exits with code 1`                                                                           |

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
4. **Huge amounts were saved with the wrong value.** Trying unusual input, `add 99999999999999.99 Yacht` was
   saved as `99999999999999.98`, and `add 9007199254740993 x` as `9007199254740992.00`. JavaScript numbers are
   exact only up to 2^53, and amounts are also multiplied by 100 for paisa, so very large amounts lose digits.
   **Fix:** `maxAmount: 1_000_000_000` in `src/config.ts`. Anything bigger is rejected with
   `Amount can be at most 1000000000.00, got ...`, both when adding and when loading the data file.
5. **`list nope` said "No expenses yet" when there were expenses.** The empty table message did not know a
   category had been asked for. **Fix:** `formatList` says `No expenses in category "nope".` when other
   expenses exist.
6. **`--help` was an "Unknown command".** People usually try `--help` or `-h` first, so both now show help
   with exit code `0`.
7. **Day 10: the month check rejected every month.** I added `monthPattern` to `src/config.ts` with a shell
   script, and the shell ate the backslash: the file had `/^d{4}-(0[1-9]|1[0-2])$/`, which wants a letter `d`
   instead of 4 digits. I saw it in `git diff` before running the tests. **Fix:** wrote it back as
   `/^\d{4}-(0[1-9]|1[0-2])$/` and added `accepts a YYYY-MM month`, which fails if this happens again. The CSV
   settings (`"\t"`, `"\r\n"`) had the same problem and the same fix. Lesson: edit code with the editor, not
   with shell quoting.

## What I learned

- `package.json` scripts are the project's command list: anyone can run `npm run check` without knowing the tools.
- `pre<name>` scripts run automatically before `<name>`.
- TypeScript, ESLint and Prettier overlap very little: types, code problems and layout.
- Validating loaded JSON is as important as validating CLI input; a bad file should stop the program, not be
  overwritten.
- Whole-number paisa avoids floating-point money errors. The data file now stores `amountPaisa` (an integer); old files with a decimal `amount` still load and are rewritten on the next save.
- Review fixes: a lock file (`expenses.json.lock`, created with `wx`, stale after 10 s) so parallel commands keep every expense; descriptions cannot contain new lines or control characters; days are shown in local time; commands are in a map instead of an `if` chain.

## For the status meeting

1. **`src/expenses.ts`** is the core: pure functions that take input and return `{ ok, value }` or
   `{ ok, error }`. Nothing here reads files or prints.
2. **`src/storage.ts`** is the only disk access: missing file → empty list, bad file → clear error and the file
   is left alone, save goes through a temp file and `rename` so a crash can't leave half a file.
3. **`src/export.ts`** builds the CSV text as a pure function; `storage.ts` writes it.
4. **`src/cli.ts`** only turns arguments and `--options` into function calls and results into text and an exit code.
5. **`src/config.ts`** holds every setting in one object.
6. **`tests/`** mirrors that split: logic, CSV, storage, and one file that runs the real CLI.
7. **Tooling**: `npm run check` runs typecheck, lint, format check and 62 tests in one go.

## Known limits

- If two runs both find the lock stale at the same moment, one may remove the other's fresh lock. This window is very small and only happens after a crash left an old lock.
