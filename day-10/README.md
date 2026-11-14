# Day 10: Writing a good PR description, giving and receiving code review

Hand-in: three improvements to the Day 9 expense-tracker CLI (`edit`, `total --month`, `export`), opened as a
pull request from the branch `day-10-expense-improvements`. The PR text is in
[PR_DESCRIPTION.md](PR_DESCRIPTION.md). The code is in [day-09/](../day-09/).

## What a pull request is

A pull request (PR) asks to merge one branch into another, usually a feature branch into `main`. It puts
the diff, the commits, the description and the review comments in one place. Nothing reaches `main` until a
reviewer approves it.

- **What:** a branch plus a description, waiting for review.
- **Why:** a second person catches bugs, unclear code and missing tests before they reach everyone else, and
  the PR stays as a record of why the change was made.
- **Where:** on GitHub, under the repository's Pull requests tab, opened from a pushed branch.

## What makes a good PR description

The reviewer has not been in your head all week. The description should let them review without asking
basic questions.

| Part                   | What it answers                                     |
| ---------------------- | --------------------------------------------------- |
| Title                  | What changes, in one line                           |
| Summary                | What and why, in two or three sentences             |
| Background             | What the reviewer needs to know about the project   |
| Changes                | What each commit or feature does                    |
| How to test            | Exact commands to copy and paste                    |
| Example output         | Real output, so they can compare with their own run |
| Edge cases             | What you already thought about and tested           |
| Checks                 | Proof the checks pass, with the test count          |
| Not included           | What is out of scope, so nobody thinks you forgot   |
| Notes for the reviewer | Where to look first, and decisions you want checked |

Keep the PR small: one topic, one commit per feature. A 3-commit PR gets a careful review; a 40-file PR gets
"looks good".

## Giving code review

- **Be kind.** Comment on the code, not the person: "this function returns NaN for an empty list", not
  "you forgot empty lists".
- **Be specific.** Name the file, the line and the input, for example: "`src/expenses.ts` line 40: what
  happens to `formatTotals` when the list is empty?"
- **Explain why.** "Use `Object.hasOwn` here, because `--constructor` would find `Object.prototype.constructor`"
  teaches something. "Change this" doesn't.
- **Mark the weight.** Say **must-fix** for bugs, data loss, security and broken checks. Say **nitpick**
  (or `nit:`) for naming and style that you can live with. The author then knows what blocks the merge.
- **Say what is good, too.** Point out a test that covers a tricky case.

## Receiving code review

- Read every comment before answering. Assume good intent.
- Fix every must-fix. For a nitpick, fix it or say briefly why not.
- If you disagree, explain your reason once, with an example or a test. Don't argue in circles.
- Reply to each comment with what you did ("Fixed in `abc1234`"), push new commits, and ask for another review.
- Every review is free teaching. Note what you learned so the same comment doesn't come up again.

## For the status meeting

**"What would you change after the review?"**

The Week 2 review asked for these changes. They are on the `review-fixes` branch, one commit per day:

| Review point | What I would change (and did) | Commit |
| --- | --- | --- |
| Edge cases | Day 5: a debounced function that throws from a timer cannot be caught by the caller (documented). Day 6 and 8: `Retry-After` for 503 too, as seconds or an HTTP date, plus jitter. Day 7: no weapon, negative damage, no target and missing config no longer crash. Day 9: new lines and control characters in a description are rejected, and amounts are stored as whole paisa. | `bf7d7e8`, `67f1f6e`, `a9676d2`, `670baee`, `329e440` |
| Time zones (my old `total --month` note) | Dates and months are now shown in local time, not UTC, with a test near midnight. | `329e440` |
| Concurrency (my old `export` race note) | Day 9 changes go through a lock file (`wx`, stale after 10 s), and a test runs 8 adds at the same time and keeps all 8. `export` still checks the file and then writes it, so that small gap is not fixed. | `329e440` |
| Closing old comments | Each earlier review comment gets its own fix commit, so a comment can be closed by pointing to it. The Week 1 fixes are `5d9d5ac` to `c3a0635`. | `5d9d5ac`..`c3a0635` |
| Repo tidiness | Generated `output/` files of Day 6 and Day 8 are no longer tracked and are in `.gitignore`; the Day 9 lock file is ignored too. | `67f1f6e`, `a9676d2`, `329e440` |
| Day labels | Day 6 and Day 8 READMEs say that Day 6 is the frozen original and Day 8 moved on. | `a9676d2` |

Still open from my own list: `edit` treats any value starting with `--` as a missing value, so a
description cannot start with `--`.
