const todos = [];
let nextId = 1;

function addTodo(title) {
  const todo = { id: nextId, title: title, done: false };
  todos.push(todo);
  nextId++;
}

function findTodo(id) {
  for (const todo of todos) {
    if (todo.id === id) return todo;
  }
  return null;
}

function completeTodo(id) {
  const todo = findTodo(id);
  if (todo === null) {
    console.log(`No task with id ${id}`);
    return;
  }
  todo.done = true;
}

function removeTodo(id) {
  for (let i = 0; i < todos.length; i++) {
    if (todos[i].id === id) {
      todos.splice(i, 1);
      return;
    }
  }
}

function printTodos() {
  for (const todo of todos) {
    const box = todo.done ? "[x]" : "[ ]";
    console.log(`${box} ${todo.id}. ${todo.title}`);
  }
  console.log("---");
}

addTodo("Learn let and const");
addTodo("Practice arrow functions");
addTodo("Push day 2 to GitHub");
printTodos();

completeTodo(1);
completeTodo(9);
removeTodo(2);
printTodos();