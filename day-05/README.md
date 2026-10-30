# Day 05 - The Event Loop, Timers, Debounce and Throttle

Day 5 is about **when** JavaScript code runs: timers, the event loop, and two
helpers built on top of them, `debounce` and `throttle`, written from scratch
with closures (Day 4) and tested with Node's built-in test runner.

## Run

```bash
node day-05/01-event-loop-order.js
node day-05/02-timers.js
node day-05/03-loop-closure-pitfall.js
node day-05/04-debounce-demo.js
node day-05/05-throttle-demo.js
node --test day-05/debounce-throttle.test.js
```

| File | Topic |
| --- | --- |
| [01-event-loop-order.js](01-event-loop-order.js) | Print order of sync code, `await`, promises, `queueMicrotask` and timers |
| [02-timers.js](02-timers.js) | `setTimeout`, `clearTimeout`, OTP countdown with `setInterval`, blocking code delays a timer |
| [03-loop-closure-pitfall.js](03-loop-closure-pitfall.js) | `var` vs `let` inside a loop with `setTimeout` |
| [debounce.js](debounce.js) | `debounce(fn, wait, { leading, trailing })` with `cancel`, `flush`, `pending` |
| [throttle.js](throttle.js) | `throttle(fn, wait, { leading, trailing })` with `cancel`, `flush`, `pending` |
| [validate.js](validate.js) | Input checks shared by `debounce` and `throttle` |
| [04-debounce-demo.js](04-debounce-demo.js) | Search box, submit button, autosave, tooltip |
| [05-throttle-demo.js](05-throttle-demo.js) | Scroll events, shoot button |
| [debounce-throttle.test.js](debounce-throttle.test.js) | 57 tests with fake timers (`node:test`) |

No packages are installed. Everything uses Node built-ins only.

---

## 1. Timers

| Function | What it does |
| --- | --- |
| `setTimeout(fn, ms)` | Runs `fn` **once**, after at least `ms` milliseconds. Returns a timer id. |
| `setInterval(fn, ms)` | Runs `fn` **again and again**, every `ms` milliseconds. Returns a timer id. |
| `clearTimeout(id)` | Cancels a `setTimeout` that has not run yet. |
| `clearInterval(id)` | Stops a `setInterval`. Without it, the interval runs forever. |

### Running and cancelling a timeout

```js
setTimeout(() => log("Welcome back, Ibad!"), 200);

const toastTimer = setTimeout(() => log("This toast was cancelled, so this never prints"), 300);
clearTimeout(toastTimer);
log("Toast timer cancelled with clearTimeout");
```

### OTP countdown with `setInterval` and `clearInterval`

```js
function startOtpCountdown() {
  let secondsLeft = 3;
  log(`OTP sent. Resend OTP in ${secondsLeft}s`);

  const intervalId = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      log(`Resend OTP in ${secondsLeft}s`);
      return;
    }
    clearInterval(intervalId);
    log("You can resend the OTP now");
    blockingDemo();
  }, 1000);
}
```

`secondsLeft` and `intervalId` live in a closure, so the interval callback can
count down and then stop itself.

### Blocking code delays a timer

```js
function blockingDemo() {
  const scheduledAt = Date.now();
  log("setTimeout(..., 0) scheduled, then a 500 ms blocking loop starts");

  setTimeout(() => {
    log(`setTimeout(..., 0) finally ran ${roundTo100(Date.now() - scheduledAt)} ms after it was scheduled`);
  }, 0);

  const blockUntil = Date.now() + 500;
  while (Date.now() < blockUntil) {}
  log("Blocking loop finished");
}
```

Output of `node day-05/02-timers.js`:

```text
[+0 ms] Page loaded
[+0 ms] Toast timer cancelled with clearTimeout
[+200 ms] Welcome back, Ibad!
[+300 ms] OTP sent. Resend OTP in 3s
[+1000 ms] Resend OTP in 2s
[+1000 ms] Resend OTP in 1s
[+1000 ms] You can resend the OTP now
[+0 ms] setTimeout(..., 0) scheduled, then a 500 ms blocking loop starts
[+500 ms] Blocking loop finished
[+0 ms] setTimeout(..., 0) finally ran 500 ms after it was scheduled
```

Each line shows the time **since the previous line**, rounded to 100 ms. Timers are never exactly
on time (on Windows they can be about 15 ms late), and with `setInterval` that small delay adds up
on every tick. Measuring from the previous line keeps the error to a single timer's delay, so the
output is the same on every run.

- The cancelled toast never prints.
- The timeout with delay `0` ran **500 ms** late, because the `while` loop kept JavaScript busy.
  The delay of a timer is a **minimum**, not a promise of exact timing.

### Where timers are used in real apps

| Use | Timer |
| --- | --- |
| OTP "Resend in 30s" countdown | `setInterval` + `clearInterval` when it reaches 0 |
| Toast message that disappears after 3 seconds | `setTimeout`, and `clearTimeout` if the user closes it first |
| Image slider that changes every 5 seconds | `setInterval`, cleared when the user leaves the page |
| Auto logout after 15 minutes of no activity | `setTimeout`, restarted (cleared and set again) on every click or key press |
| Search box that waits until the user stops typing | `setTimeout` restarted on every key press, which is exactly **debounce** |

---

## 2. The event loop in simple words

JavaScript runs **one thing at a time** on a single thread. A few parts work together:

1. **Call stack**: the function that is running right now. Normal (sync) code runs here, top to bottom.
2. **Web APIs / Node APIs**: when you call `setTimeout`, the browser (or Node) counts the time,
   **not** JavaScript. JavaScript moves on to the next line straight away.
3. **Task queue** (also called macrotask queue): when a timer is done, its callback waits here.
4. **Microtask queue**: callbacks from promises (`.then`, the code after `await`) and `queueMicrotask` wait here.
5. **Event loop**: it keeps asking *"is the call stack empty?"* When it is, it first runs **all**
   microtasks, then takes **one** task from the task queue, then runs all microtasks again, and so on.

So **promises always run before timers**, even a timer with delay `0`.

### Example: guess the order

```js
console.log("1. Sync: script starts");

setTimeout(() => {
  console.log("7. Timer A");
  Promise.resolve().then(() => console.log("8. Promise created inside timer A"));
}, 0);

setTimeout(() => console.log("9. Timer B"), 0);

async function loadProfile() {
  console.log("2. Async function: before await");
  await null;
  console.log("4. Async function: after await");
}

loadProfile();

Promise.resolve().then(() => {
  console.log("5. Promise.then");
  setTimeout(() => console.log("10. Timer created inside a promise"), 0);
});

queueMicrotask(() => console.log("6. queueMicrotask"));

console.log("3. Sync: script ends");
```

Output of `node day-05/01-event-loop-order.js`:

```text
1. Sync: script starts
2. Async function: before await
3. Sync: script ends
4. Async function: after await
5. Promise.then
6. queueMicrotask
7. Timer A
8. Promise created inside timer A
9. Timer B
10. Timer created inside a promise
```

Why this order:

- **1, 2, 3**: sync code. An `async` function runs like normal code **until** the first `await`, so 2 prints before 3.
- **4, 5, 6**: microtasks, in the order they were queued. `await` paused `loadProfile` and queued the rest of it first.
- **7**: the stack and the microtask queue are empty, so the event loop takes the first timer.
- **8 before 9**: timer A queued a promise. Microtasks run after **every** task, so 8 jumps ahead of timer B.
- **10**: this timer was only created while step 5 ran, so it is last in the task queue.

### Why `setTimeout(fn, 0)` runs after the rest of the code

`0` does not mean "now". It means "put `fn` in the task queue as soon as possible".
The event loop only takes it from the queue when the call stack is empty, so all
the remaining sync code, and all microtasks, run first. If sync code is slow (like the
500 ms `while` loop above), the timer simply waits longer.

### Where the event loop matters in real apps

| Situation | What the event loop does |
| --- | --- |
| Button clicks | The click handler is a task. It only runs when the stack is empty, so a slow handler makes the page feel frozen. |
| `fetch` / API calls | The browser does the network request. JavaScript keeps running, and the `.then` / code after `await` runs later as a microtask. |
| Keeping the page responsive while waiting | Because waiting happens outside JavaScript, the user can still scroll, type and click while data loads. Long sync loops block all of that. |
| React / Next.js data loading | Components show a loading state first, then `await` the data and render again when the promise resolves. |

---

## 3. The `var` vs `let` loop pitfall

```js
for (var i = 1; i <= 3; i++) {
  setTimeout(() => console.log(`var i = ${i}`), 0);
}

for (let j = 1; j <= 3; j++) {
  setTimeout(() => console.log(`let j = ${j}`), 0);
}
```

Output of `node day-05/03-loop-closure-pitfall.js`:

```text
var i = 4
var i = 4
var i = 4
let j = 1
let j = 2
let j = 3
```

Why it happens:

- The timers run **after** the loop has finished (section 2).
- `var` is function-scoped, so there is only **one** `i` for the whole loop. All three
  callbacks close over that same `i`, which is already `4` when they finally run.
- `let` is block-scoped, and a `for` loop creates a **new** `j` for every round.
  Each callback has its own closure (Day 4) with its own `j`: 1, 2 and 3.

The fix is simply to use `let` (or `const`) in loops.

---

## 4. Debounce and throttle

### What they are

- **Debounce**: wait until the calls **stop**, then run once.
  *"Run only after the user has been quiet for `wait` ms."* Every new call restarts the wait.
- **Throttle**: run **at most once every** `wait` ms, no matter how many calls come in.
  *"Run regularly while the calls keep coming, but never faster than this."*

| Situation | Use | Why |
| --- | --- | --- |
| Search box that calls an API | Debounce | Search once for "laptop", not 6 times for "l", "la", "lap"... |
| Autosave a form or draft | Debounce | Save when the user stops typing |
| Window resize, recalculate layout | Debounce | Only the final size matters |
| Submit / Pay button | Debounce with `leading: true, trailing: false` | First click works right away, double clicks are ignored |
| Scroll position, infinite scroll | Throttle | Need regular updates while scrolling, not 100 per second |
| Mouse move, drag, game shoot button | Throttle | Limit the rate but keep reacting |
| Rate-limited API (e.g. 1 request/second) | Throttle | Never go over the limit |

### How the closure holds the timer

`debounce` returns a new function. The variables below are created **once per debounced
function** and live in its closure, so every call sees and changes the same timer:

```js
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;
  let result;
```

Every call clears the old timer and starts a new one. That is the whole idea of debounce:

```js
  function debounced(...args) {
    const isFirstCallOfBurst = timerId === null;
    clearTimer();
    timerId = setTimeout(onWaitEnd, wait);

    if (leading && isFirstCallOfBurst) return run(this, args);

    if (trailing) {
      lastArgs = args;
      lastThis = this;
    }
    return result;
  }
```

Two debounced functions never share state, because each call to `debounce(...)` creates
fresh variables (there is a test for this).

### Why `fn.apply(this, args)` is needed

```js
  const run = (context, args) => {
    clearSaved();
    result = fn.apply(context, args);
    return result;
  };
```

If the wrapper just called `fn(...args)`, `this` inside `fn` would be `undefined`
(see [Day 4: `this`](../day-04/README.md#3-this), "Losing `this`"). The wrapper is
written as a **regular** `function`, so when it is called as `form.submit()` its `this`
is `form`. It saves that `this` and passes it on with `apply`, together with all arguments.
This is what makes the next example work:

```js
  const form = {
    name: "Signup form",
    submits: 0,
    submit: debounce(
      function () {
        this.submits++;
        console.log(`  ${this.name} submitted`);
      },
      1000,
      { leading: true, trailing: false },
    ),
  };
```

`clearSaved()` runs **before** `fn`. So if `fn` throws an error, the error still reaches the
caller, but the debounced function is already reset and keeps working for the next call.

### `leading` and `trailing`

| Option | Debounce | Throttle |
| --- | --- | --- |
| `trailing: true` | Run once after the calls stop, with the **latest** args (default) | One extra run at the end of the window, if there were calls during it (default) |
| `leading: true` | Run immediately on the first call of a burst | First call runs immediately (default) |
| both `true` | A single call runs **once**; a burst runs at the start **and** at the end | Run at the start and once at the end of each busy window |
| both `false` | `RangeError` (it would never run) | `RangeError` |

Defaults: `debounce` is `{ leading: false, trailing: true }`, `throttle` is `{ leading: true, trailing: true }`.

### `cancel`, `flush`, `pending`

| Method | What it does |
| --- | --- |
| `cancel()` | Clears the timer and the saved args. Nothing runs. The next call starts fresh (throttle also resets its window). |
| `flush()` | If a run is waiting, run it **now** and return its result. If nothing is waiting, do nothing and return the last result. |
| `pending()` | `true` while a timer is waiting, otherwise `false`. |

`cancel` and `flush` must call `clearTimeout` on the old timer. If they only forgot the saved
args, the old timer would still fire later and run the **next** call too early. There are tests
for exactly this ("cancel then call again", "flush then call again").

### Debounce: full code

```js
import { validateTimingArgs } from "./validate.js";

export function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  validateTimingArgs(fn, wait, leading, trailing);

  let timerId = null;
  let lastArgs = null;
  let lastThis = null;
  let result;

  const clearTimer = () => {
    clearTimeout(timerId);
    timerId = null;
  };

  const clearSaved = () => {
    lastArgs = null;
    lastThis = null;
  };

  const run = (context, args) => {
    clearSaved();
    result = fn.apply(context, args);
    return result;
  };

  const runSaved = () => run(lastThis, lastArgs);

  const onWaitEnd = () => {
    timerId = null;
    if (lastArgs !== null) runSaved();
  };

  function debounced(...args) {
    const isFirstCallOfBurst = timerId === null;
    clearTimer();
    timerId = setTimeout(onWaitEnd, wait);

    if (leading && isFirstCallOfBurst) return run(this, args);

    if (trailing) {
      lastArgs = args;
      lastThis = this;
    }
    return result;
  }

  debounced.cancel = () => {
    clearTimer();
    clearSaved();
  };

  debounced.flush = () => {
    if (timerId === null) return result;
    clearTimer();
    return lastArgs !== null ? runSaved() : result;
  };

  debounced.pending = () => timerId !== null;

  return debounced;
}
```

### Throttle: full code

`windowStart` is the time the current window began: the time of the last run, or the
first call when `leading` is `false`.

```js
import { validateTimingArgs } from "./validate.js";

export function throttle(fn, wait, { leading = true, trailing = true } = {}) {
  validateTimingArgs(fn, wait, leading, trailing);

  let timerId = null;
  let windowStart = null;
  let lastArgs = null;
  let lastThis = null;
  let result;

  const clearTimer = () => {
    clearTimeout(timerId);
    timerId = null;
  };

  const clearSaved = () => {
    lastArgs = null;
    lastThis = null;
  };

  const run = (context, args) => {
    clearSaved();
    windowStart = Date.now();
    result = fn.apply(context, args);
    return result;
  };

  const runSaved = () => run(lastThis, lastArgs);

  const isNewWindow = (now) =>
    windowStart === null || now - windowStart >= wait || now < windowStart;

  const onWindowEnd = () => {
    timerId = null;
    if (lastArgs !== null) runSaved();
  };

  function throttled(...args) {
    const now = Date.now();

    if (isNewWindow(now)) {
      clearTimer();
      if (leading) return run(this, args);
      windowStart = now;
    }

    if (trailing) {
      lastArgs = args;
      lastThis = this;
      if (timerId === null) {
        timerId = setTimeout(onWindowEnd, windowStart + wait - now);
      }
    }
    return result;
  }

  throttled.cancel = () => {
    clearTimer();
    clearSaved();
    windowStart = null;
  };

  throttled.flush = () => {
    if (timerId === null) return result;
    clearTimer();
    return runSaved();
  };

  throttled.pending = () => timerId !== null;

  return throttled;
}
```

- A new window starts when it is the first call, when `wait` ms have passed (`>=`, so a call at
  **exactly** `wait` ms runs), or when the clock went **backwards** (`now < windowStart`).
- With `trailing`, only one timer is started per window, and it fires at the **end** of that window
  (`windowStart + wait - now`), not `wait` ms after the latest call.

### Input validation (shared by both)

```js
const MAX_TIMEOUT = 2147483647;

export function validateTimingArgs(fn, wait, leading, trailing) {
  if (typeof fn !== "function") {
    throw new TypeError("fn must be a function");
  }
  if (!Number.isFinite(wait) || wait < 0 || wait > MAX_TIMEOUT) {
    throw new TypeError(`wait must be a finite number from 0 to ${MAX_TIMEOUT}`);
  }
  if (typeof leading !== "boolean" || typeof trailing !== "boolean") {
    throw new TypeError("leading and trailing must be true or false");
  }
  if (!leading && !trailing) {
    throw new RangeError("leading and trailing cannot both be false");
  }
}
```

`Number.isFinite` is `false` for `NaN`, `Infinity`, strings like `"100"`, `null` and `undefined`,
so one check covers all of those. `2147483647` ms (about 24.8 days) is the largest delay `setTimeout`
accepts. A bigger value does not wait longer: Node prints a warning and runs the timer after 1 ms,
so it is rejected instead.

### Demo: debounce

```js
  let typed = "";
  for (const letter of "laptop") {
    typed += letter;
    console.log(`  Typed: ${typed}`);
    search(typed);
    await sleep(100);
  }
```

```js
  saveDraft("Hello");
  saveDraft("Hello wor");
  saveDraft("Hello world");
  console.log(`  Pending before flush: ${saveDraft.pending()}`);
  const savedLength = saveDraft.flush();
  console.log(`  flush() returned ${savedLength}, pending after flush: ${saveDraft.pending()}`);
```

Output of `node day-05/04-debounce-demo.js`:

```text
(a) Search box, wait 300 ms
  Typed: l
  Typed: la
  Typed: lap
  Typed: lapt
  Typed: lapto
  Typed: laptop
  Searching for "laptop"
(b) Submit button, leading: true, trailing: false
  Signup form submitted
  Clicks: 3, submits: 1
(c) Autosave with flush()
  Pending before flush: true
  Saved draft: "Hello world"
  flush() returned 11, pending after flush: false
(d) Tooltip with cancel()
  Pending: true
  After cancel, pending: false
  Tooltip never appeared
```

In (b), `form.submit.cancel()` is called at the end so the 1 second timer does not keep the demo waiting.

### Demo: throttle

```js
  const onScroll = throttle((eventNumber) => console.log(`    Handled scroll #${eventNumber}`), 330);

  for (let eventNumber = 0; eventNumber < 10; eventNumber++) {
    setTimeout(() => {
      console.log(`  Scroll event #${eventNumber}`);
      onScroll(eventNumber);
    }, eventNumber * 100);
  }
```

The events come at 0, 100, ..., 900 ms. With `wait` 330 the throttle runs at 0, 330, 660 and 990 ms,
always at least 30 ms away from an event, so the output is the same on every run.

Output of `node day-05/05-throttle-demo.js`:

```text
(a) 10 scroll events, one every 100 ms, throttle wait 330 ms
  Scroll event #0
    Handled scroll #0
  Scroll event #1
  Scroll event #2
  Scroll event #3
    Handled scroll #3
  Scroll event #4
  Scroll event #5
  Scroll event #6
    Handled scroll #6
  Scroll event #7
  Scroll event #8
  Scroll event #9
    Handled scroll #9
(b) Shoot button, leading only, wait 1000 ms
  5 fast clicks -> shots: 1
  1 click 1.1 s later -> shots: 2
```

10 events, 4 handler runs. #0 runs straight away (leading). #3, #6 and #9 are the trailing runs
at the end of each window, with the **latest** event of that window.

---

## 5. Tests

```bash
node --test day-05/debounce-throttle.test.js
```

The tests use **fake timers**, so they do not really wait and always give the same result:

```js
beforeEach(() => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
});

afterEach(() => {
  mock.timers.reset();
});
```

One big `mock.timers.tick(300)` moves the fake `Date.now()` to the **end** before the timer
callbacks run, so every callback would see time 300. To check the exact time of each call,
the tests move the clock 10 ms at a time:

```js
function advance(ms) {
  for (let passed = 0; passed < ms; passed += 10) {
    mock.timers.tick(10);
  }
}
```

### Edge cases handled

| Input / situation | Behaviour | Test |
| --- | --- | --- |
| `fn` missing, `null`, a string, number, object or array | `TypeError` | rejects a missing or non-function fn |
| `wait` negative, `NaN`, `Infinity`, `-Infinity`, `"100"`, `null`, missing, `[100]` | `TypeError` | rejects a negative, NaN, infinite... wait |
| `wait` above `2147483647` (the `setTimeout` maximum) | `TypeError` (`2147483647` itself is accepted) | rejects wait above 2147483647 |
| `debounce()` / `throttle()` with no arguments | `TypeError` | rejects being called with no arguments at all |
| `leading: "yes"` or `trailing: 1` | `TypeError` | rejects non-boolean leading or trailing |
| options is `null` | `TypeError` | rejects null options |
| `leading: false, trailing: false` | `RangeError` | rejects leading and trailing both false |
| `wait` is `0` | Debounce: still async (runs on the next timer tick). Throttle: runs every call | wait 0 tests |
| Debounced function called with no arguments | `fn` runs with no arguments | works when called with no arguments |
| Same wrapper called from two objects | Uses `this` and args of the **latest** call | uses this of the latest call / forwards this on leading and trailing |
| Debounce `leading + trailing`, single call | Runs **once**, not twice | leading + trailing: a single call runs once |
| Throttle, single call | Runs **once**, not twice | a single call runs once |
| Throttle call at **exactly** `wait` ms | Runs immediately | a call exactly wait ms after the last run |
| Clock goes backwards (`now < last run`) | Treated as a new window, runs | a clock that goes backwards |
| `cancel()` / `flush()` with nothing pending | Does nothing, no error | cancel with nothing pending / flush with nothing pending |
| `cancel()` or `flush()`, then a new call | Old timer is cleared, new call runs at the right time | cancel then call again / flush then call again |
| `fn` throws | Leading call and `flush()`: the error reaches the caller. Trailing (timer) call: there is no caller, so the error is uncaught, but the wrapper was already reset and keeps working | keeps working after fn throws |
| Two wrappers made from the same code | Do not share state | separate instances do not share state |

### Mutation check

To make sure the tests really catch bugs, the code was broken on purpose in 22 ways (for example
removing `apply`, not restarting the timer, `cancel` or `flush` without `clearTimeout`, no trailing
timer, leading on every call, no wait validation, ignoring a clock that goes backwards), one at a
time, and the tests were run each time. 20 of the 22 broken versions made at least one test fail.
The code was restored after every run.

The 2 that no test caught do not change what the functions do:

- Throttle not clearing the saved args after a run: saved args are only used by a timer, and every
  path that starts a timer overwrites them first, so the old args can never run. They only stay in memory longer.
- Debounce clearing the saved args **after** `fn` instead of before: the next call always overwrites
  them, so nothing different happens. The part of "reset before calling `fn`" that **can** be seen is
  the timer and the throttle window, and breaking those is caught.

---

## What I learned

- JavaScript runs one thing at a time. Timers are counted outside JavaScript, and their callbacks
  wait in a queue until the call stack is empty.
- Microtasks (promises, code after `await`, `queueMicrotask`) always run before the next timer,
  even a timer with delay 0.
- A timer's delay is a minimum. Slow sync code makes every timer late.
- `var` in a loop gives one shared variable, `let` gives a new one per round.
- Debounce and throttle are just a closure around one timer id, plus `apply` so `this` and arguments are not lost.
- Fake timers make time-based code easy to test exactly, without waiting.

## Trickiest part

The edge cases between calls and timers. A `leading + trailing` debounce must not run twice for one
click, so the leading run must not save its args for the trailing run. `cancel` and `flush` must
clear the old timer, not just the saved args, otherwise the leftover timer fires the next call too
early. And in the tests, one big `tick()` jumps the fake clock to the end before callbacks run, so
the tests had to move time in small steps to check exactly **when** each call happened.
