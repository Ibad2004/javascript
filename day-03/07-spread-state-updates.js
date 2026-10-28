const user = { name: "Ibad", age: 22, theme: "light" };

const updatedUser = { ...user, theme: "dark" };
console.log(user);
console.log(updatedUser);

const withSettings = { ...user, settings: { notifications: true } };
console.log(withSettings);

const tasks = ["Learn map", "Learn filter"];

const added = [...tasks, "Learn reduce"];
const addedToStart = ["Wake up", ...tasks];
const removed = added.filter((t) => t !== "Learn filter");

console.log(tasks);
console.log(added);
console.log(addedToStart);
console.log(removed);

const todos = [
  { id: 1, title: "Map", done: false },
  { id: 2, title: "Filter", done: false },
];
const toggled = todos.map((t) => (t.id === 2 ? { ...t, done: true } : t));
console.log(todos);
console.log(toggled);

const defaults = { color: "blue", size: "M", qty: 1 };
const choice = { size: "L" };
console.log({ ...defaults, ...choice });
