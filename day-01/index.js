// Day 01 - Environment setup check
// Run with: node day-01/index.js   (or: npm start)

const greeting = "Hello, JavaScript!";
console.log(greeting);

console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);

// A tiny first exercise: variables, a function and an array
const topics = ["JavaScript", "React", "Next.js"];

function describeTopics(list) {
  return list.map((topic, index) => `${index + 1}. ${topic}`).join("\n");
}

console.log("\nLearning path:");
console.log(describeTopics(topics));
