const user = {
  id: 7,
  name: "Ibad",
  email: "ibad@example.com",
  address: {
    city: "Lahore",
    country: "Pakistan",
  },
  skills: ["JavaScript", "Python"],
};

const { name, email } = user;
console.log(name, email);

const { name: fullName } = user;
console.log(fullName);

const { phone = "Not added" } = user;
console.log(phone);

const {
  address: { city },
} = user;
console.log(city);

function profileCard({ name, address: { country }, skills }) {
  return `${name} from ${country} knows ${skills.length} languages`;
}
console.log(profileCard(user));

const users = [
  { name: "Sara", age: 21 },
  { name: "Ahmed", age: 25 },
];
users.forEach(({ name, age }) => console.log(`${name} is ${age}`));
