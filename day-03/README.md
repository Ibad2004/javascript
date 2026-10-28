# Day 03 - Array Methods, Destructuring, Spread and Rest

Topics: `map`, `filter`, `reduce`, object and array destructuring, spread `...` and rest `...`.

## Run

```bash
node day-03/01-map-products.js
```

Or open any file in VS Code and click ▶ (Code Runner).

## Exercises

| # | File | What it does | Concepts |
| --- | --- | --- | --- |
| 01 | [01-map-products.js](01-map-products.js) | Builds names, prices with tax and numbered labels | `map`, index, returning objects `({ })` |
| 02 | [02-filter-search.js](02-filter-search.js) | Product search, budget filter and in-stock list | `filter`, `includes`, `&&` |
| 03 | [03-reduce-totals.js](03-reduce-totals.js) | Cart total, item count, totals per category, most expensive item | `reduce` to a number, an object and one item |
| 04 | [04-orders-report.js](04-orders-report.js) | Sales report: revenue, average and spend per customer | chaining `filter` → `map` → `reduce` |
| 05 | [05-object-destructuring.js](05-object-destructuring.js) | Unpacks a user profile | renaming, defaults, nested, in function inputs, `forEach` |
| 06 | [06-array-destructuring.js](06-array-destructuring.js) | Swap, min/max, skipping items, splitting a date | array destructuring, `split`, defaults |
| 07 | [07-spread-state-updates.js](07-spread-state-updates.js) | Updates objects and lists without changing the originals | spread for copies, toggle with `map` |
| 08 | [08-rest-parameters.js](08-rest-parameters.js) | Sum any amount of numbers, a logger, removing a password | rest parameters, rest in destructuring, `join` |
| 09 | [09-group-by.js](09-group-by.js) | Groups students by grade and finds above-average students | grouping with `reduce`, `toFixed` |
| 10 | [10-leaderboard.js](10-leaderboard.js) | Combines two rounds into a sorted leaderboard | everything + `Object.entries`, `sort` |

## What I learned

- `map` changes every item and returns a new array of the same length.
- `filter` keeps only the items whose test returns `true`.
- `reduce` combines an array into one value: a number, an object or a single item.
- None of the three change the original array.
- Destructuring unpacks values: `{ }` for objects (by key name), `[ ]` for arrays (by position).
- Spread `...` opens up an array or object, which is useful for making updated copies.
- Rest `...` gathers leftover values into an array or object and must come last.
- Spread on the right side opens things up; rest on the left side or in function inputs gathers them.

## Trickiest solution

- Exercise 10 (leaderboard): spread joins the rounds, `reduce` totals the points, `Object.entries` + `map` turn the totals into objects, `sort` ranks them, and rest destructuring picks the champion and runner-up.
