# Day 02 - JavaScript Basics

Topics: `let` / `const`, functions, arrow functions, objects and arrays.



```bash
node day-02/01-variables.js
```


## Exercises

| # | File | What it does | Concepts |
| --- | --- | --- | --- |
| 01 | [01-variables.js](01-variables.js) | Prints a sentence using a name and an age | `const`, `let`, template literals |
| 02 | [02-swap.js](02-swap.js) | Swaps the values of two variables | `let`, temporary variable |
| 03 | [03-shopping-cart.js](03-shopping-cart.js) | Prints a receipt with subtotal and discount | arrays of objects, small functions, `+=` |
| 04 | [04-grade-calculator.js](04-grade-calculator.js) | Gives each student a grade and finds the topper | arrow functions, early `return`, `padEnd` |
| 05 | [05-word-counter.js](05-word-counter.js) | Counts how often each word appears | `split`, objects as counters, bracket notation |
| 06 | [06-bank-account.js](06-bank-account.js) | Deposits and withdrawals with rules and history | changing objects in functions, guard clauses |
| 07 | [07-todo-list.js](07-todo-list.js) | Adds, completes, removes and prints tasks | `splice`, ternary `? :`, `null` |
| 08 | [08-number-stats.js](08-number-stats.js) | Finds min, max, sum and average | returning an object from a function |
| 09 | [09-inventory.js](09-inventory.js) | Sells and restocks items, lists low stock | `for...in`, `-=`, `\|\|` default value |
| 10 | [10-functions-as-values.js](10-functions-as-values.js) | Calculator and repeat helper using passed-in functions | functions as values, callbacks |

## What I learned

- Use `const` by default and `let` only when the value changes.
- A function takes inputs, does work and `return`s a result. Without `return` it gives `undefined`.
- Arrow functions are a shorter way to write functions: `(n) => n * 2`.
- Objects store labelled values (`student.name`). Arrays store ordered lists that start at index 0.
- `for...of` loops over array values. `for...in` loops over object keys.
- `x += 5` means `x = x + 5`, and `x -= 5` means `x = x - 5`.
- `value || 0` uses `value`, or `0` if it is empty.
- Passing an object into a function changes the same object, not a copy.
- Functions are values: they can be stored in objects and passed to other functions (`calculate(10, 5, add)`).

## Took the longest

- Exercise 10 (functions as values)