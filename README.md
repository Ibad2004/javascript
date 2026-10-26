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
