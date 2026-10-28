const products = [
  { name: "iPhone 15", price: 250000, inStock: true },
  { name: "Samsung S24", price: 220000, inStock: false },
  { name: "Redmi Note 13", price: 55000, inStock: true },
  { name: "iPhone 13", price: 160000, inStock: true },
  { name: "Infinix Hot 40", price: 35000, inStock: false },
];

const search = (list, text) =>
  list.filter((p) => p.name.toLowerCase().includes(text.toLowerCase()));

const inBudget = (list, min, max) =>
  list.filter((p) => p.price >= min && p.price <= max);

const available = products.filter((p) => p.inStock);

console.log(search(products, "iphone"));
console.log(inBudget(products, 30000, 100000));
console.log(available.map((p) => p.name));
console.log(search(products, "nokia"));
