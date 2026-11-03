# Day 07 - Debugging (work in progress)

## Where this code comes from

This folder is the `bugs` branch of
[nadia643/debug-adventure](https://github.com/nadia643/debug-adventure)
("Manchester Codes Debugging Adventure", by Ian King, MIT license).
The bugs were planted on purpose by the original authors for debugging practice.

Changes made when copying it here:

- `package.json`: Jest updated from 24 to 29, `"type": "commonjs"` added (the root
  of this repo uses ES modules), the unused ESLint config and the empty `index.js` left out.
- No other code was changed. The bugs are exactly as in the original `bugs` branch.

## The challenge

Most of the tests fail. Find the bugs in `src/` and fix them so the tests pass.
There are no bugs in the tests. Use breakpoints, not `console.log`.

## Run

```bash
cd day-07
npm install
npm test
```
