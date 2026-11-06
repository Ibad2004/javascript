# Add edit, monthly total and CSV export to the expense-tracker CLI

## Summary

This PR adds three commands to the Day 9 expense-tracker CLI:

- `edit` fixes a typo or a wrong amount without deleting and re-adding the expense, so the id and date stay
  the same.
- `total --month` answers "how much did I spend this month?".
- `export` writes a CSV file that opens safely in a spreadsheet.

Every new input is validated. Bad input gives a clear message, exits with code `1` and never changes the data
file.

## Background

The CLI was built on Day 9 in `day-09/`. It is strict TypeScript with ESLint, Prettier and `node --test`, all
run by `npm run check`. Expenses are stored in `data/expenses.json` as `{ nextId, expenses }` and saved through
a temp file and `rename`. Money is added in whole paisa so totals never have floating-point errors. The code is
split into pure logic (`src/expenses.ts`), file I/O (`src/storage.ts`), settings (`src/config.ts`) and argument
parsing and printing (`src/cli.ts`). This PR keeps that split and adds `src/export.ts`.

## Changes

### 1. Add edit command (`Add edit command`)

- `npm start -- edit <id> [--amount X] [--description "text"] [--category name]`
- `editExpense` in `src/expenses.ts` changes only the given fields and keeps `id` and `date`. It reuses
  `parseAmount` and `parseDescription` from `add`, so the same rules apply (greater than 0, at most 2 decimals,
  at most 1,000,000,000, non-empty description). The category is trimmed and lowercased.
- `parseArgs` in `src/cli.ts` reads `--options`. It rejects unknown options, an option without a value, the
  same option twice and extra words. Option names are looked up in a `Map`, so `--constructor` is unknown
  rather than matching `Object.prototype`.
- Prints `Edited #2: 150.00 Bus fare (transport)`. `add` now prints through the same `describeExpense` helper.

### 2. Add monthly total (`Add monthly total`)

- `npm start -- total --month 2026-11`
- `parseMonth` accepts only `YYYY-MM` with month `01`-`12`, using `monthPattern` in `src/config.ts`.
- `filterByMonth` uses the UTC date already stored on each expense (`isoDay`). `list` uses the same helper.
- `formatTotals` takes the empty message as a parameter, so an empty month prints `No expenses in 2026-12` and
  `Total: 0.00`.
- `total` without `--month` prints exactly what it did before.

### 3. Add CSV export (`Add CSV export`)

- `npm start -- export <file.csv> [--force]`
- `src/export.ts` (pure): `toCsv`, `escapeCsvCell`, `protectFormula`, `parseCsvPath`. Columns are
  `id,date,category,amount,description`, with the amount to 2 decimals, the date as `YYYY-MM-DD` and `\r\n`
  line endings (RFC 4180).
- Quoting: a value with a comma, quote or new line is wrapped in quotes and its quotes are doubled.
- CSV injection: a cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading `'`. The list
  is `csvFormulaStarts` in `src/config.ts`.
- `src/storage.ts`: the temp-file-and-rename code from `saveStore` is now `writeTextSafely`, and both
  `saveStore` and the new `writeExport` use it. `writeExport` refuses an existing file unless `--force` is
  given.
- No expenses: writes the header row only and prints
  `No expenses yet. Exported the header row only to <file>`.
- `day-09/*.csv` is added to `.gitignore`.

### 4. Docs

- `day-09/README.md`: new commands with examples, help text, new edge-case rows, one new "What broke" entry.
- `day-10/README.md`: notes on PRs and code review. This file is `day-10/PR_DESCRIPTION.md`.
- Root `README.md`: Progress row for Day 10.

## How to test

```sh
git fetch origin
git checkout day-10-expense-improvements
cd day-09
npm install
npm run check

npm start -- add 450 "Lunch, with team" food
npm start -- add 120.50 "Bus fare" transport
npm start -- add 75 'The "best" chai' Drinks
npm start -- edit 2 --amount 150
npm start -- edit 2 --price 150
npm start -- list
npm start -- total --month 2026-11
npm start -- total --month 2026-12
npm start -- export expenses.csv
npm start -- export expenses.csv
npm start -- export expenses.csv --force
```

Use a month that has expenses in place of `2026-11`. In Windows PowerShell 5.1, write the third command as
`npm start -- add 75 'The \"best\" chai' Drinks`, because PowerShell 5.1 removes inner quotes when it passes
arguments to a program. To keep your own data safe, set `EXPENSES_FILE` to a test file first.

## Example output

Real run on 2026-11-06, starting with no data file:

```text
> add 450 "Lunch, with team" food
Added #1: 450.00 Lunch, with team (food)
> add 120.50 "Bus fare" transport
Added #2: 120.50 Bus fare (transport)
> add 75 'The "best" chai' Drinks
Added #3: 75.00 The "best" chai (drinks)
> edit 2 --amount 150
Edited #2: 150.00 Bus fare (transport)
> edit 2 --price 150
Unknown option "--price". Allowed: --amount, --description, --category.
[exit 1]
> list
ID  DATE        CATEGORY   AMOUNT  DESCRIPTION
1   2026-11-06  food       450.00  Lunch, with team
2   2026-11-06  transport  150.00  Bus fare
3   2026-11-06  drinks      75.00  The "best" chai
> total --month 2026-11
Total: 675.00
  drinks: 75.00
  food: 450.00
  transport: 150.00
> total --month 2026-12
No expenses in 2026-12
Total: 0.00
> export expenses.csv
Exported 3 expenses to expenses.csv
> export expenses.csv
File expenses.csv already exists. Add --force to overwrite it.
[exit 1]
```

`expenses.csv`:

```csv
id,date,category,amount,description
1,2026-11-06,food,450.00,"Lunch, with team"
2,2026-11-06,transport,150.00,Bus fare
3,2026-11-06,drinks,75.00,"The ""best"" chai"
```

## Edge cases handled

| Feature | Edge case                                                    | Result                                                         | Test                                                                           |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| edit    | missing / `abc` / unknown id                                 | `Id is required.` / `Id must be...` / `No expense with id 99.` | `edit rejects a missing, non-number or unknown id`                             |
| edit    | no fields given                                              | `Nothing to edit. Give at least one of ...`                    | `edit rejects no fields`                                                       |
| edit    | `--price`                                                    | `Unknown option "--price". Allowed: ...`                       | `bad edits exit with code 1 and leave the file unchanged`                      |
| edit    | `--amount` with no value, or followed by another option      | `Option "--amount" needs a value.`                             | same                                                                           |
| edit    | `--amount 5 --amount 6`                                      | `Option "--amount" was given twice.`                           | same                                                                           |
| edit    | new amount `0`, `-5`, `abc`, `12.345`, `Infinity`, too large | same messages as `add`                                         | `edit rejects invalid new values with the same rules as add`                   |
| edit    | blank description or category                                | `Description is required.` / `Category cannot be empty.`       | same                                                                           |
| edit    | any error                                                    | exit `1`, data file byte-for-byte unchanged                    | `bad edits exit with code 1 and leave the file unchanged`                      |
| total   | `2026-13`, `2026-1`, `26-11`, `abc`, `2026-00`               | `Month must be YYYY-MM with month 01-12, ...`                  | `rejects 2026-13, 2026-1, 26-11, abc and 2026-00`                              |
| total   | `--month` with no value                                      | `Option "--month" needs a value.`                              | `total with a bad or missing month exits with code 1`                          |
| total   | month with no expenses                                       | `No expenses in 2026-12` + `Total: 0.00`, no NaN               | `a month with no expenses says so and totals 0.00, never NaN`                  |
| total   | expenses on 31 Oct 23:59 and 1 Nov 00:00 UTC                 | only November counted                                          | `totals only the expenses of that month`                                       |
| export  | comma, quote, new line                                       | quoted, quotes doubled                                         | `quotes values with commas, quotes or new lines and doubles quotes`            |
| export  | `=SUM(...)`, `+92`, `-5`, `@home`, also in category          | leading `'`                                                    | `prefixes cells starting with = + - @ ...`, `protects the category column too` |
| export  | name not ending in `.csv`, bare `.csv`, missing              | clear error                                                    | `rejects a missing name, another extension and a bare .csv`                    |
| export  | existing file without `--force`                              | refused, file unchanged                                        | `refuses to overwrite an existing file unless force is set`                    |
| export  | no expenses                                                  | header row only, plus a message                                | `export with no expenses writes the header row and says so`                    |

## Checks

`npm run check` passes: `tsc --noEmit`, `eslint .` and `prettier . --check` are clean, and
`node --test` gives **62 tests, 62 pass, 0 fail**. There were 37 tests on `main`, so this PR adds 25. The check
also passed after each feature commit.

## Not included / follow-ups

- No `--description=text` form, only `--description text`. A description can't start with `--`.
- `total --month` uses the UTC month, not local time. A local-time option would need a time zone setting.
- `export` writes no UTF-8 BOM, so older Excel versions may show Urdu or other non-ASCII text wrongly.
- `export` checks that the file exists and then writes it. Another program could create the file in between.
  `fs.open` with the `wx` flag would close that gap.
- `total` with extra words (`total 2026-11`) is now an error that shows the `--month` usage. Before, extra
  words were ignored.

## Notes for the reviewer

- Start with `parseArgs` in `src/cli.ts`, the only new parsing code. Does it make sense to keep it in
  `cli.ts`, or should it move to its own file with unit tests? Right now it is tested through the CLI tests.
- `edit --category "  "` is an error, while `add` with a blank category falls back to `other`. I chose this
  because a blank value in an edit is more likely a mistake. Is that the right call?
- In `src/storage.ts`, the save code was moved into `writeTextSafely` without changing what it does. The
  existing `saveStore` tests still pass.
- Please mark each comment as must-fix or nitpick.
