

const cart = [
  { name: "Keyboard", price: 3500, qty: 1 },
  { name: "Mouse", price: 1200, qty: 2 },
  { name: "USB Cable", price: 450, qty: 3 },
];


const lineTotal = (item) => item.price * item.qty;


function cartTotal(items) {
  let total = 0;
  for (const item of items) {
    total += lineTotal(item); 
  }
  return total;
}


function applyDiscount(total, percent, minimum) {
  if (total < minimum) {
    return total; 
  }
  return total - (total * percent) / 100;
}

function printReceipt(items) {
  console.log("----- RECEIPT -----");
  for (const item of items) {
    console.log(`${item.name} x${item.qty} = Rs ${lineTotal(item)}`);
  }
  const total = cartTotal(items);
  const finalTotal = applyDiscount(total, 10, 5000);
  console.log(`Subtotal: Rs ${total}`);
  console.log(`Discount: Rs ${total - finalTotal}`);
  console.log(`Total:    Rs ${finalTotal}`);
}

printReceipt(cart);