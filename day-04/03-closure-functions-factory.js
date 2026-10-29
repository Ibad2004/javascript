function makeMultiplier(factor) {
  return (number) => number * factor;
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

console.log(double(5));
console.log(triple(5));

function makeGreeting(greeting) {
  return (name) => `${greeting}, ${name}!`;
}

const sayHello = makeGreeting("Hello");
const sayAssalam = makeGreeting("Assalam o Alaikum");

console.log(sayHello("Sara"));
console.log(sayAssalam("Ali"));

function once(fn) {
  let called = false;
  let result;
  return (...args) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
}

const placeOrder = once((item) => `Order placed for ${item}`);
console.log(placeOrder("Pizza"));
console.log(placeOrder("Burger"));
