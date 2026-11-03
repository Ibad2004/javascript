# Day 07 - Debugging with Breakpoints and Stack Traces

Day 7 is about **finding bugs properly**: instead of adding `console.log` everywhere, I
**paused the code** with breakpoints and looked at the real values while it was running.

**Hand-in:** fix 3 planted bugs in a small repo using breakpoints, not `console.log`.
I found and fixed bugs 1, 2 and 3 with the VS Code debugger. While doing that, the stack
traces showed 2 more bugs (4 and 5), which I fixed too, so every test now passes.

## Where this code comes from

This folder is the `bugs` branch of
[nadia643/debug-adventure](https://github.com/nadia643/debug-adventure)
("Manchester Codes Debugging Adventure", by Ian King, MIT license). It is a tiny text
adventure game (a player, enemies and weapons). The bugs were **planted on purpose** by the
original authors, and the tests are correct: *"There are no bugs in the tests."*

Changes made when copying it here, before any fixing:

- `package.json`: Jest updated from 24 to 29, and `"type": "commonjs"` added, because the
  root of this repo uses ES modules (`import`) but this project uses `require()`.
- The unused ESLint config and the empty `index.js` were left out.
- No code in `src/` or `__tests__/` was changed. The commit "Day 07: buggy starter from
  debug-adventure" is the exact buggy starting point.

## How to run

```bash
cd day-07
npm install
npm test
```

| Folder / file | What it is |
| --- | --- |
| `src/character.js` | Base for every person in the game: name, health, healing, taking damage, talking |
| `src/player.js` | The hero: can equip a weapon and attack. **All the bugs were in this file.** |
| `src/enemy.js` | Enemies (for example a skeleton) that attack |
| `src/weapon.js` | A weapon with a name, damage and attack type |
| `__tests__/*.test.js` | Jest tests, one file per `src` file. These are the "checker" and were not changed. |

**Before:** 6 failed, 21 passed. **After:** 27 passed, 0 failed.

### Requirements and conditions

- Node 18 or newer (I used Node 24) and npm. `npm install` downloads Jest.
- **Windows PowerShell:** `npx` may be blocked with *"running scripts is disabled on this
  system"*. Using `npx.cmd` instead of `npx` works without changing any settings.
- Breakpoints only pause when the code runs **with a debugger attached** (the VS Code
  **JavaScript Debug Terminal**, F5, or `node --inspect`). In a normal terminal they are ignored.
- `npx.cmd jest --runInBand ...` runs the tests one at a time in one process, so the
  debugger can follow them.

---

## Why breakpoints instead of `console.log`

| `console.log` | Breakpoint |
| --- | --- |
| Shows only the values I thought to print | Shows **every** variable, `this`, and the call stack at that moment |
| Edit, run, read, edit again | Pause once, then look around and step line by line |
| Adds lines I must remember to delete | Changes nothing in the code |

**Where it is used in real work:** finding why a page shows the wrong total, why a form
crashes on submit, or why an API answer is `undefined`, without filling the code with logs.

## The tools, in simple words

| Tool | What it is | Why I used it |
| --- | --- | --- |
| **Breakpoint** (red dot) | A mark on a line. When the code reaches it, everything stops. | To freeze the program where the error happened |
| **Variables / Scope panel** | Shows every variable and its value while paused | To see what a value **really** is, not what I think it is |
| **Hover** | Mouse over a name to see its value | Quick check of one value |
| **Call stack** | The list of functions that led to this line | To see that the test called `player.attack`, which crashed |
| **Continue** (F5) | Run until the next breakpoint | To finish a run |
| **Step over** (F10) | Run this line, go to the next one | To watch a value change line by line |
| **Step into** (F11) | Go **inside** the function on this line | To follow `player.equip(sword)` into `player.js` |
| **Step out** (Shift+F11) | Finish this function, go back to the caller | To get back to the test |
| **JavaScript Debug Terminal** | A VS Code terminal where every `node` command runs with the debugger attached | Easiest way to debug Jest tests |
| **Node inspector** (`node --inspect-brk file.js`) | Starts Node paused on line 1 and waits for a debugger | Lets Chrome DevTools debug Node code |
| **Chrome DevTools** (`chrome://inspect`) | Chrome's debugger, connected to Node | The same tools as VS Code, in the browser. For browser code (like my quiz game) it is F12, then the Sources tab |
| **Pause on exceptions** | Stops automatically on the line that throws | Finds a crash without guessing where to put the breakpoint |

I used the **VS Code debugger** for bugs 1 to 3. Chrome DevTools works the same way:
run `node --inspect-brk file.js`, open `chrome://inspect`, click **inspect**, then use the
same breakpoints, Scope panel and step buttons.

## How to read a stack trace

This is the real error from bug 3:

```text
TypeError: Cannot read properties of undefined (reading 'damage')

  > 26 |   target._takeDamage(this.weapon.damage);

  at Player.damage (src/player.js:26:34)
  at Object.attack (__tests__/player.test.js:52:14)
```

| Part | Meaning |
| --- | --- |
| `TypeError` | The kind of error: a value was the wrong type |
| `Cannot read properties of undefined (reading 'damage')` | Something was `undefined`, and the code tried to read `.damage` from it |
| `> 26 \| ...` | The exact line, with `^` pointing at the spot |
| `at ... (src/player.js:26:34)` | **Where it crashed:** file `player.js`, line 26, column 34 |
| `at ... (__tests__/player.test.js:52:14)` | **Who called it:** the test, line 52 (`player.attack(trainingDummy)`) |

**Rule:** the first line says **what** went wrong; the first `at` line in my own code says
**where to look**. The place the error **shows** is not always the place of the **cause**
(see bug 1).

| Error type | Meaning | Seen in |
| --- | --- | --- |
| `TypeError` | A value is the wrong type, e.g. using `new` on something that is not a function, or reading a property of `undefined` | Bugs 1, 3 |
| `ReferenceError` | A name that does not exist at all | Bug 4 |
| Test `Expected` / `Received` | No crash, but the value is wrong | Bug 2 |

---

## The bugs

All bugs were in `src/player.js`. I fixed one at a time and re-ran the tests after each
fix, because one bug can hide the next: while every test crashed on bug 1, bugs 2 to 5
could not show.

### Bug 1: `Player is not a constructor`

**Symptom:** all 6 player tests failed with the same error, at line 29 of the test:

```text
TypeError: Player is not a constructor

  > 29 |     player = new Player(config);
```

**How I found it:** I put a breakpoint on **line 29 of `__tests__/player.test.js`** and ran
the tests in the JavaScript Debug Terminal. While paused, I hovered over `Player`. It showed
only `[[Prototype]]: Object`, so `Player` was an **empty object `{}`**, not a function.
(`player` with a small `p` was `undefined`, which is normal because line 29 had not run yet.)

`Player` comes from `require('../src/player')`. `require` returns whatever the file puts in
`module.exports`. If a file never sets it, `require` gives back an empty object. So the
problem was how `player.js` shares the function. I compared the last line of `player.js`
with `enemy.js`:

```js
module.export = Player;
```

**Cause:** a typo. `module.export` (no **s**) is just a normal, unused property. Node only
looks at `module.exports`.

**Fix:**

```js
module.exports = Player;
```

**Lesson:** the error **showed** in the test file, but the **cause** was in `player.js`.

### Bug 2: equip did not store the weapon

**Symptom:** no crash, but a wrong value:

```text
expect(received).toEqual(expected)

Expected: {"attackType": "slashes", "damage": 3, "name": "bronze sword"}
Received: undefined
```

**How I found it:** a breakpoint on **line 45 of the test** (`player.equip(sword);`), then
**Step Into (F11)** to go inside `equip`. In the Variables panel:

| Name | Value while paused inside `equip` |
| --- | --- |
| `weapon` (the input) | `{name: 'bronze sword', damage: 3, attackType: 'slashes'}` |
| `this.weapon` | does not exist on the player, so `undefined` |
| `this.equippedWeapon` after **Step Over (F10)** | still `undefined` |

The sword **did arrive** in the function, but the line stored something else:

```js
Player.prototype.equip = function (weapon) {
  this.equippedWeapon = this.weapon;
};
```

**Cause:** `this.weapon` (a property on the player, which does not exist) instead of
`weapon` (the input).

**Fix:**

```js
Player.prototype.equip = function (weapon) {
  this.equippedWeapon = weapon;
};
```

### Bug 3: attack read `this.weapon`

**Symptom:**

```text
TypeError: Cannot read properties of undefined (reading 'damage')

  > 26 |   target._takeDamage(this.weapon.damage);
```

This time the stack trace pointed straight into `src/player.js`, line 26.

**How I found it:** a breakpoint on **line 26 of `src/player.js`**. While paused I opened
`this` in the Variables panel: the player had `equippedWeapon` (the sword, stored there by
the bug 2 fix) but **no `weapon` property**.

My first try was to remove `this.` like in bug 2, but that is wrong here: `attack` only
receives `target`, so a plain `weapon` does not exist in this function and would give a
`ReferenceError`. The sword is stored on the player as `equippedWeapon`.

**Cause:** the code read the weapon from the wrong property.

**Fix:**

```js
  target._takeDamage(this.equippedWeapon.damage);
```

### Bugs 4 and 5: the attack description

After bug 3, the stack trace moved to the next line:

```text
ReferenceError: enemy is not defined

  > 27 |   return this._describeAttack(enemy);
```

**Bug 4:** inside `attack` there is no variable called `enemy`. The one being attacked
arrives as `target`.

**Bug 5:** `_describeAttack` had no input and used `this.target.name`, but the player never
stores a `target`, so it would crash next with `Cannot read properties of undefined
(reading 'name')`.

I fixed these two from the stack traces, not with breakpoints. The fix makes `player.js`
work the same way as `enemy.js`, where the target is passed in:

```js
Player.prototype._describeAttack = function (target) {
  return `${this.name} lets out a ${this.dialogue}, and hits ${target.name} with ${this.equippedWeapon.name} for ${this.equippedWeapon.damage} damage!`;
};
```

```js
Player.prototype.attack = function (target) {
  target._takeDamage(this.equippedWeapon.damage);
  return this._describeAttack(target);
};
```

### Summary

| Bug | Symptom | Found with | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | `Player is not a constructor` | Breakpoint in the test + hover: `Player` was `{}` | `module.export` typo | `module.exports` |
| 2 | equip: expected the sword, got `undefined` | Breakpoint + **Step Into** `equip` | Stored `this.weapon` instead of the `weapon` input | `this.equippedWeapon = weapon` |
| 3 | `reading 'damage'` of `undefined` | Breakpoint on `player.js:26`, looked inside `this` | Read `this.weapon` | `this.equippedWeapon.damage` |
| 4 | `enemy is not defined` | Stack trace | Undefined name `enemy` | Pass `target` |
| 5 | Would crash on `this.target.name` | Reading the code after bug 4 | Player never stores a target | `_describeAttack(target)` uses `target.name` |

The git history shows the buggy starter and each fix:

| Commit | What it contains |
| --- | --- |
| `Day 07: buggy starter from debug-adventure` | The original `bugs` branch, unchanged |
| `Day 07: fix bug 1 - module.export typo in player.js` | Bug 1 only |
| `Day 07: fix bugs 4 and 5 - ...` | Bugs 2, 3, 4 and 5. I forgot to commit bugs 2 and 3 on their own, so they ended up in this commit even though its title only names 4 and 5. |
| `Day 07: fix bugs 4 and 5, add README` | Only this README and the Progress row (no code) |

### Two oddities left as they are

The tests do not check these, and they do not break anything, so I did not change them:

- `require('../src/character')` works, but `require('./character')` is the normal way.
- The constructor sets `equippedWeapon` from `config` (so it starts as `undefined`). The
  original working version starts it as `null`, meaning "no weapon yet".

---

## What broke and how I fixed it

1. **`npx` was blocked in PowerShell.** It said *"npx.ps1 cannot be loaded because running
   scripts is disabled on this system"*. `npm test` had worked earlier because it ran in
   Command Prompt. Using `npx.cmd` instead of `npx` fixed it without changing any Windows
   settings.
2. **The tests seemed stuck at `RUNS`.** It was not stuck: I had left my breakpoint on
   line 29, and in the JavaScript Debug Terminal the debugger paused there. Line 29 runs
   before every test, so it would have paused 6 times. I removed the breakpoint and pressed
   Continue (F5). Now I use a normal terminal to just see results, and the Debug Terminal
   only when I want to pause.
3. **I fixed bug 1 before committing the buggy starter.** I put the bug back, committed the
   starter, then re-applied the fix as its own commit, so the history shows the exact
   one-letter change. Later I forgot to commit bugs 2 and 3 separately, so they share a commit
   with bugs 4 and 5 (see the commit table above). Next time: commit right after each fix.
4. **My first fix for bug 3 was wrong.** I removed `this.` like in bug 2, but `attack` has no
   `weapon` input. Looking at `this` while paused showed the sword is in `equippedWeapon`.
5. **I first looked in the wrong files.** I compared the end of the **test** files instead of
   `src/enemy.js` and `src/player.js`. The bugs are always in `src/`; the tests are the checker.

## What I learned

- A breakpoint shows the real value, and it is often not what I assumed: `Player` looked
  like it should be a function, but it was `{}`.
- Read the stack trace first: what went wrong, and the first line in my own code.
- Where an error **shows** is not always where it is **caused**.
- One bug can hide others, so fix one, re-run, and read the next error.
- **Step Into** is how to follow a value into a function.
- `module.exports` must be spelled exactly, or `require` returns an empty object.
- `weapon` (an input) and `this.weapon` (a property) are completely different things.

## Trickiest part

Bug 2, because nothing crashed. The test just said `Received: undefined`. Only by stepping
into `equip` could I see that the sword arrived correctly in `weapon`, and the line stored
`this.weapon` instead, which looks almost the same but does not exist.

## For the status meeting: how I found each bug

- **Bug 1:** All tests crashed with "Player is not a constructor". I paused on the line that
  creates the player and hovered over `Player`: it was an empty object, not a function. An
  empty object from `require` means the file did not export properly, and the export line
  said `module.export` instead of `module.exports`.
- **Bug 2:** No crash, just `undefined`. I paused on `player.equip(sword)` and used Step Into
  to go inside `equip`. The sword was in the `weapon` input, but the code saved
  `this.weapon`, which does not exist.
- **Bug 3:** The stack trace pointed at `player.js` line 26. I paused there and opened
  `this`: the sword was in `equippedWeapon`, not `weapon`.
- Then the stack trace showed bugs 4 and 5 on the next lines, which I fixed by passing
  `target` through, the same way `enemy.js` does.
