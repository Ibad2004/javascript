# Day 04 - Modules, Closures and `this`

This file explains the three Day 4 topics with small code examples.
Every example is a runnable file in this folder.

## Run

```bash
node day-04/modules/main.js
node day-04/01-closure-counter.js
node day-04/02-closure-bank-pin.js
node day-04/03-closure-functions-factory.js
node day-04/04-this-basics.js
node day-04/05-this-arrow-vs-regular.js
```

| File | Topic |
| --- | --- |
| [modules/math.js](modules/math.js), [modules/format.js](modules/format.js), [modules/main.js](modules/main.js) | Modules: `export` and `import` |
| [01-closure-counter.js](01-closure-counter.js) | Closures: a private counter |
| [02-closure-bank-pin.js](02-closure-bank-pin.js) | Closures: private balance and PIN |
| [03-closure-functions-factory.js](03-closure-functions-factory.js) | Closures: functions that make functions, `once` |
| [04-this-basics.js](04-this-basics.js) | `this` in methods, losing `this`, `bind` and `call` |
| [05-this-arrow-vs-regular.js](05-this-arrow-vs-regular.js) | `this` in arrow functions vs regular functions |

---

## 1. Modules

### What is a module?

A module is just a JavaScript file that shares some of its code with other files.
Instead of writing everything in one huge file, the code is split into small files,
and each file decides what it wants to share.

- `export` = "other files are allowed to use this"
- `import` = "I want to use something from another file"

Anything that is **not** exported stays private to its file.

### Named exports

A file can export many things by name.

```js
// modules/math.js
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}

export const circleArea = (radius) => PI * radius * radius;

const secretHelper = () => "only used inside math.js"; // not exported
```

They are imported with `{ }`, and the names must match:

```js
import { add, circleArea, PI } from "./math.js";

console.log(add(2, 3));              // 5
console.log(circleArea(2).toFixed(2)); // 12.57
```

### Default export

A file can also have **one** default export: the "main thing" of that file.
It is imported **without** `{ }`, and you can give it any name.

```js
// modules/format.js
export default function formatPrice(amount) {
  return `Rs ${amount.toLocaleString("en-US")}`;
}

export const shout = (text) => text.toUpperCase() + "!";
```

```js
import formatPrice, { shout } from "./format.js";

console.log(formatPrice(150000));  // Rs 150,000
console.log(shout("modules work")); // MODULES WORK!
```

### Import everything

`* as name` puts all the named exports into one object:

```js
import * as math from "./math.js";

console.log(math.add(10, 20));          // 30
console.log(typeof math.secretHelper);  // undefined -> it was never exported
```

### Things to remember

| | Named export | Default export |
| --- | --- | --- |
| How many per file | As many as you want | Only one |
| Import syntax | `import { add } from "./math.js"` | `import formatPrice from "./format.js"` |
| Name when importing | Must match | Any name you like |

- In Node, the file path needs the `.js` ending: `"./math.js"`, not `"./math"`.
- Node only understands `import`/`export` when `package.json` has `"type": "module"` (this repo does).
- Why it matters: React and Next.js are built completely from modules. Every component lives in its own file and is imported where it is needed.

---

## 2. Closures

### What is a closure?

A closure is when a function **remembers the variables from the place where it was created**,
even after that outer function has finished running.

A simple way to picture it: when a function is created inside another function,
it carries a small **backpack** with the outer variables it uses. Wherever the inner
function goes, the backpack goes with it.

### Example: a private counter

```js
function createCounter() {
  let count = 0;          // lives inside createCounter

  return function () {    // this inner function uses count
    count++;
    return count;
  };
}

const counterA = createCounter();
const counterB = createCounter();

console.log(counterA()); // 1
console.log(counterA()); // 2
console.log(counterA()); // 3
console.log(counterB()); // 1  -> counterB has its own, separate count

console.log(typeof count); // undefined -> count cannot be reached from outside
```

What happens step by step:

1. `createCounter()` runs, creates `count = 0`, and returns the inner function.
2. `createCounter` is finished, but `count` is **not** thrown away, because the inner function still uses it.
3. Every call to `counterA()` changes the same remembered `count`.
4. Calling `createCounter()` again creates a **new** `count`, so `counterB` starts from 1.
5. Nothing outside can read or change `count` directly. It is private.

### Example: a bank account with a private balance and PIN

```js
function createAccount(owner, pin) {
  let balance = 0;

  const checkPin = (enteredPin) => enteredPin === pin;

  return {
    deposit(amount) {
      balance += amount;
      return `${owner} deposited ${amount}`;
    },
    withdraw(amount, enteredPin) {
      if (!checkPin(enteredPin)) return "Wrong PIN";
      if (amount > balance) return "Not enough balance";
      balance -= amount;
      return `${owner} withdrew ${amount}`;
    },
    getBalance(enteredPin) {
      return checkPin(enteredPin) ? balance : "Wrong PIN";
    },
  };
}

const account = createAccount("Ibad", 1234);

console.log(account.deposit(5000));       // Ibad deposited 5000
console.log(account.withdraw(1000, 1111)); // Wrong PIN
console.log(account.withdraw(1000, 1234)); // Ibad withdrew 1000
console.log(account.getBalance(1234));     // 4000

console.log(account.balance); // undefined
console.log(account.pin);     // undefined
```

On Day 2 the bank account was a normal object, so anyone could write
`account.balance = 1000000`. Here `balance` and `pin` live only inside the closure.
The only way to touch them is through the three functions, and they follow the rules.

### Example: functions that make functions

```js
function makeMultiplier(factor) {
  return (number) => number * factor; // remembers factor
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

`double` remembers `factor = 2`, and `triple` remembers `factor = 3`.

A more useful one, `once`, makes sure a function only runs a single time
(for example, so a "Place order" button can't place two orders):

```js
function once(fn) {
  let called = false;
  let result;
  return (...args) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
}

const placeOrder = once((item) => `Order placed for ${item}`);
console.log(placeOrder("Pizza"));  // Order placed for Pizza
console.log(placeOrder("Burger")); // Order placed for Pizza -> did not run again
```

### Things to remember

- A closure = a function + the outer variables it remembers.
- Each call of the outer function creates a **fresh** set of variables.
- Closures are how JavaScript makes **private** data.
- Why it matters: React hooks like `useState` and event handlers depend on closures, and Day 5's debounce and throttle are built with them.

---

## 3. `this`

### What is `this`?

`this` means **"the object that is calling the function right now."**

The important part: `this` is decided **when the function is called**, not when it is written.
The easiest rule is to look at what is on the **left of the dot** when the function is called.

### `this` in a method

```js
const student = {
  name: "Ibad",
  skills: ["JavaScript", "Python"],

  introduce() {
    return `Hi, I am ${this.name}`;
  },

  addSkill(skill) {
    this.skills.push(skill);
    return `${this.name} now knows ${this.skills.length} skills`;
  },
};

console.log(student.introduce());       // Hi, I am Ibad   -> left of the dot is student
console.log(student.addSkill("React")); // Ibad now knows 3 skills
```

### The same function, a different `this`

```js
const other = { name: "Sara", introduce: student.introduce };
console.log(other.introduce()); // Hi, I am Sara -> left of the dot is now other
```

It is the exact same function, but it is called by a different object, so `this` changes.

### Losing `this`

```js
const loose = student.introduce;
loose(); // Error: Cannot read properties of undefined (reading 'name')
```

Nothing is on the left of the dot any more, so `this` is `undefined`
and `this.name` crashes. This is the most common `this` bug.

### Fixing `this` with `bind` and `call`

```js
const fixed = student.introduce.bind(student);
console.log(fixed()); // Hi, I am Ibad -> bind locks this to student forever

console.log(student.introduce.call({ name: "Ahmed" })); // Hi, I am Ahmed
```

- `bind(obj)` makes a **new** function where `this` is always `obj`.
- `call(obj)` runs the function **once, right now**, with `this` set to `obj`.

### Arrow functions do not have their own `this`

An arrow function does not create its own `this`. It uses the `this` of the place
where it was written (just like a closure remembers outer variables).

```js
const team = {
  name: "Frontend Team",
  members: ["Ibad", "Sara", "Ali"],

  listWithArrow() {
    return this.members.map((member) => `${member} is in ${this.name}`);
  },

  listWithRegular() {
    return this.members.map(function (member) {
      return `${member} is in ${this ? this.name : "undefined"}`;
    });
  },

  arrowMethod: () => `arrowMethod sees this = ${this}`,
};

console.log(team.listWithArrow());
// [ 'Ibad is in Frontend Team', 'Sara is in Frontend Team', 'Ali is in Frontend Team' ]

console.log(team.listWithRegular());
// [ 'Ibad is in undefined', 'Sara is in undefined', 'Ali is in undefined' ]

console.log(team.arrowMethod());
// arrowMethod sees this = undefined
```

- **`listWithArrow` works:** the arrow inside `map` borrows `this` from `listWithArrow`, which is `team`.
- **`listWithRegular` breaks:** the regular function inside `map` is called by `map`, not by `team`, so it gets its own `this`, which is `undefined`.
- **`arrowMethod` breaks:** an arrow function used *as the method itself* borrows `this` from outside the object, where there is no object at all.

The same thing happens with timers:

```js
const timer = {
  seconds: 0,
  start() {
    const id = setInterval(() => {
      this.seconds++;              // arrow -> this is still timer
      console.log(`Tick ${this.seconds}`);
      if (this.seconds === 3) clearInterval(id);
    }, 100);
  },
};

timer.start(); // Tick 1, Tick 2, Tick 3
```

### Things to remember

| How the function is called | What `this` is |
| --- | --- |
| `obj.method()` | `obj` (left of the dot) |
| `fn()` on its own (in a module) | `undefined` |
| `fn.call(obj)` / `fn.bind(obj)()` | `obj` |
| Arrow function | Whatever `this` was where the arrow was written |

- Use **regular functions** (method shorthand `introduce() { }`) for object methods.
- Use **arrow functions** inside methods (for `map`, `setInterval`, and so on) so `this` stays the same.

---

## Summary

- **Modules:** split code into files. `export` shares, `import` uses. Unexported code stays private.
- **Closures:** a function remembers the variables from where it was created. This gives private data and function factories.
- **`this`:** the object calling the function, decided at call time. Arrow functions borrow `this` from where they were written.
