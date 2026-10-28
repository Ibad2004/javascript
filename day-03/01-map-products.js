const products = [
  { name: "laptop", price: 150000 },
  { name: "mouse", price: 2000 },
  { name: "headphones", price: 8500 },
];

const names = products.map((p) => p.name.toUpperCase());

const withTax = products.map((p) => ({
  name: p.name,
  price: p.price,
  priceWithTax: p.price * 1.17,
}));

const labels = products.map((p, index) => `${index + 1}. ${p.name} - Rs ${p.price}`);

console.log(names);
console.log(withTax);
console.log(labels);
