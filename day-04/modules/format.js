export default function formatPrice(amount) {
  return `Rs ${amount.toLocaleString("en-US")}`;
}

export const shout = (text) => text.toUpperCase() + "!";
