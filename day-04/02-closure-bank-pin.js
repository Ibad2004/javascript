function createAccount(owner, pin) {
  let balance = 0;

  const checkPin = (enteredPin) => enteredPin === pin;

  return {
    deposit(amount) {
      balance += amount;
      return `${owner} deposited ${amount}`;
    },
    withdraw(amount, enteredPin) {
      if (!checkPin(enteredPin)) return "Wrong PIN";
      if (amount > balance) return "Not enough balance";
      balance -= amount;
      return `${owner} withdrew ${amount}`;
    },
    getBalance(enteredPin) {
      return checkPin(enteredPin) ? balance : "Wrong PIN";
    },
  };
}

const account = createAccount("Ibad", 1234);

console.log(account.deposit(5000));
console.log(account.withdraw(1000, 1111));
console.log(account.withdraw(1000, 1234));
console.log(account.getBalance(1234));

console.log(account.balance);
console.log(account.pin);
