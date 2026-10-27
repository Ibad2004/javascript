const account = {
  owner: "Ibad",
  balance: 0,
  history: [],
};

function deposit(acc, amount) {
  if (amount <= 0) {
    console.log("Deposit must be more than 0");
    return;
  }
  acc.balance += amount;
  acc.history.push(`+${amount}`);
}

function withdraw(acc, amount) {
  if (amount > acc.balance) {
    console.log(`Cannot withdraw ${amount}, balance is only ${acc.balance}`);
    return;
  }
  acc.balance -= amount;
  acc.history.push(`-${amount}`);
}

deposit(account, 5000);
withdraw(account, 1500);
withdraw(account, 10000);
deposit(account, -20);
deposit(account, 700);

console.log(`${account.owner}'s balance: ${account.balance}`);
console.log("History:", account.history);