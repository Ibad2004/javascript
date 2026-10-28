const orders = [
  { id: 1, customer: "Ali", amount: 4500, status: "delivered" },
  { id: 2, customer: "Sara", amount: 12000, status: "cancelled" },
  { id: 3, customer: "Ali", amount: 3000, status: "delivered" },
  { id: 4, customer: "Hina", amount: 8000, status: "delivered" },
  { id: 5, customer: "Sara", amount: 2500, status: "pending" },
  { id: 6, customer: "Hina", amount: 1500, status: "delivered" },
];

const delivered = orders.filter((o) => o.status === "delivered");

const revenue = delivered
  .map((o) => o.amount)
  .reduce((sum, amount) => sum + amount, 0);

const average = revenue / delivered.length;

const spentByCustomer = delivered.reduce((totals, o) => {
  totals[o.customer] = (totals[o.customer] || 0) + o.amount;
  return totals;
}, {});

const bigOrders = orders
  .filter((o) => o.amount >= 5000)
  .map((o) => `#${o.id} ${o.customer} (${o.status})`);

console.log("Delivered orders:", delivered.length);
console.log("Revenue:", revenue);
console.log("Average order:", average);
console.log("Spent by customer:", spentByCustomer);
console.log("Big orders:", bigOrders);
