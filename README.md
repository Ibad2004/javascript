# JavaScript

A learning repository for daily exercises in **JavaScript**, **React** and **Next.js**.
Each day gets its own folder, so progress is easy to follow from the first
`console.log` to full Next.js apps.

## Repository structure

```
javascript/
├── day-01/              # One folder per day of practice
│   ├── index.js         # The day's code
│   └── README.md        # Goals, how to run it, what I learned
├── task-tracker/        # Week 3 (Days 11 to 15): Vite + React + TypeScript app
├── notes/               # Reference notes (Git, JS concepts, React, ...)
│   └── git-cheatsheet.md
├── templates/
│   └── day-XX/          # Starter files to copy for a new day
├── .editorconfig        # Shared editor settings (2-space indent, LF)
├── .gitignore           # Files Git should ignore (node_modules, .env, ...)
├── package.json         # Project info and npm scripts
└── README.md
```

As the work grows, React and Next.js projects will go in their own
day folders (for example `day-15-react-counter/`), each with its own
`package.json`.

## Requirements

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 18 or newer (includes npm)
- [VS Code](https://code.visualstudio.com/) (recommended)

Check they are installed:

```bash
git --version
node -v
npm -v
```

## Getting started

```bash
git clone https://github.com/Ibad2004/javascript.git
cd javascript
code .
```

Run an exercise:

```bash
node day-01/index.js
# or
npm start
```

## Adding a new day

1. Copy the template: `cp -r templates/day-XX day-02`
   (PowerShell: `Copy-Item -Recurse templates\day-XX day-02`)
2. Write the code in `day-02/index.js` and fill in `day-02/README.md`.
3. Commit and push:

   ```bash
   git add .
   git commit -m "Day 02: <topic>"
   git push
   ```

## Progress

| Day | Topic | Folder |
| --- | --- | --- |
| 01 | Environment setup, first script | [day-01](day-01/) |
| 02 | JS basics: let/const, functions, arrow functions, objects, arrays | [day-02](day-02/) |
| 03 | Array methods, destructuring, spread/rest | [day-03](day-03/) |
| 04 | Modules, closures, this | [day-04](day-04/) |
| 05 | Event loop, timers, debounce and throttle | [day-05](day-05/) |
| 06 | Promises, async/await, fetch, error handling | [day-06](day-06/) |
| 07 | Debugging: breakpoints, Node inspector, stack traces | [day-07](day-07/) |
| 08 | TypeScript: types, interfaces, unions, generics, narrowing | [day-08](day-08/) |
| 09 | npm, scripts, ESLint, Prettier: expense-tracker CLI | [day-09](day-09/) |
| 10 | Pull requests and code review: expense-tracker improvements | [day-10](day-10/) |
| 11 | React with Vite + TypeScript: components, JSX, props and state (static data) | [task-tracker](task-tracker/) |
| 12 | Events, forms, controlled inputs, lists and keys: add, edit and delete tasks (in memory) | [task-tracker](task-tracker/) |
| 13 | useEffect, fetching, loading and error states: read tasks from a mock API (json-server) | [task-tracker](task-tracker/) |
| 14 | Custom hooks, lifting state, context, React Router: filters, a task detail page, a useTasks hook | [task-tracker](task-tracker/) |
| 15 | Styling, basic accessibility, responsive layout: deployed on Vercel | [task-tracker](task-tracker/) |

Days 11 to 15 build one app, the [task tracker](task-tracker/) (Week 3). Its own README lists what
each day adds. Days 12 to 15 are planned.
