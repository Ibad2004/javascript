# Day 01 - Setup

## Goals

- Create the GitHub repository and clone it locally
- Open the project in VS Code
- Confirm Git, Node.js and npm are installed
- Set up the folder structure and README
- Make the first commit and push it

## Run

```bash
node day-01/index.js
```

## Notes

- `git --version`, `node -v` and `npm -v` print the installed versions.
- `git status` shows what has changed since the last commit.


## What broke / How I fixed it

- PowerShell blocked npm and npx (npm.ps1 cannot be loaded because running scripts is disabled). Fix: use npm.cmd / npx.cmd, which don't need the script policy.
- My commits had two author names (Ibad2004 and Ibad Ur Rahman). Fix: set git user.name, and the root README notes it.
