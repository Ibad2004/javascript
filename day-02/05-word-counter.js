function countWords(sentence) {
  const words = sentence
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((word) => word !== "");
  const counts = {};

  for (const word of words) {
    if (counts[word] === undefined) {
      counts[word] = 1;
    } else {
      counts[word] += 1;
    }
  }
  return counts;
}

const text = "the cat and the dog and the bird";
const result = countWords(text);

console.log(result);
console.log("'the' appears", result["the"], "times");