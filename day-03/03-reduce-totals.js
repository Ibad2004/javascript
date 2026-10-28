const cart = [
  { name: "Shirt", category: "clothes", price: 2500, qty: 2 },
  { name: "Jeans", category: "clothes", price: 4000, qty: 1 },
  { name: "Charger", category: "electronics", price: 1800, qty: 1 },
  { name: "Earbuds", category: "electronics", price: 6000, qty: 1 },
  { name: "Notebook", category: "stationery", price: 300, qty: 4 },
];

const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

const itemCount = cart.reduce((count, item) => count + item.qty, 0);

const byCategory = cart.reduce((result, item) => {
  const cost = item.price * item.qty;
  result[item.category] = (result[item.category] || 0) + cost;
  return result;
}, {});

const mostExpensive = cart.reduce((best, item) =>
  item.price > best.price ? item : best
);

console.log("Total:", total);
console.log("Items:", itemCount);
console.log("By category:", byCategory);
console.log("Most expensive:", mostExpensive.name);
