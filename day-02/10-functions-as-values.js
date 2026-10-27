const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
const multiply = (a, b) => a * b;
const divide = (a, b) => (b === 0 ? "Cannot divide by 0" : a / b);

const operations = {
  "+": add,
  "-": subtract,
  "*": multiply,
  "/": divide,
};

function calculate(a, b, operation) {
  return operation(a, b);
}

console.log(calculate(10, 5, add));
console.log(calculate(10, 5, multiply));

const symbols = ["+", "-", "*", "/"];
for (const symbol of symbols) {
  const fn = operations[symbol];
  console.log(`12 ${symbol} 4 = ${fn(12, 4)}`);
}
console.log(calculate(8, 0, divide));

function repeat(times, action) {
  for (let i = 1; i <= times; i++) {
    action(i);
  }
}

repeat(3, (i) => console.log(`Round ${i}`));