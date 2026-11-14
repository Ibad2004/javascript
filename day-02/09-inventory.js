const stock = {
  apples: 12,
  bananas: 3,
  mangoes: 0,
  oranges: 8,
};

function sell(item, qty) {
  if (qty <= 0) {
    console.log("Quantity must be more than 0");
    return;
  }
  if (stock[item] === undefined) {
    console.log(`We don't sell ${item}`);
  } else if (stock[item] < qty) {
    console.log(`Only ${stock[item]} ${item} left, can't sell ${qty}`);
  } else {
    stock[item] -= qty;
    console.log(`Sold ${qty} ${item}`);
  }
}

function restock(item, qty) {
  if (qty <= 0) {
    console.log("Quantity must be more than 0");
    return;
  }
  stock[item] = (stock[item] || 0) + qty;
}

function lowStock(limit) {
  const low = [];
  for (const item in stock) {
    if (stock[item] <= limit) {
      low.push(item);
    }
  }
  return low;
}

sell("apples", 5);
sell("bananas", 10);
sell("grapes", 1);
restock("mangoes", 20);
restock("grapes", 6);

console.log(stock);
console.log("Low stock (5 or less):", lowStock(5));
