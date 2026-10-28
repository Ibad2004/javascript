const sumAll = (...numbers) => numbers.reduce((total, n) => total + n, 0);

console.log(sumAll(1, 2));
console.log(sumAll(5, 10, 15, 20));
console.log(sumAll());

function log(level, ...messages) {
  console.log(`[${level.toUpperCase()}] ${messages.join(" | ")}`);
}

log("info", "Server started");
log("error", "Database down", "Retrying in 5s", "Attempt 2");

function introduce(name, ...hobbies) {
  if (hobbies.length === 0) return `${name} has no hobbies listed`;
  return `${name} likes ${hobbies.join(", ")}`;
}

console.log(introduce("Ibad", "coding", "cricket", "gaming"));
console.log(introduce("Sara"));

const { password, ...safeUser } = { name: "Ali", email: "ali@example.com", password: "1234" };
console.log(safeUser);

const [leader, ...team] = ["Hina", "Ali", "Sara", "Ahmed"];
console.log(`Leader: ${leader}, team: ${team.length} people`);
