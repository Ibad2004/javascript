const students = [
  { name: "Ibad", score: 88 },
  { name: "Sara", score: 95 },
  { name: "Ahmed", score: 72 },
  { name: "Zara", score: 54 },
  { name: "Ali", score: 91 },
  { name: "Hina", score: 78 },
];

const getGrade = (score) => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "F";
};

const byGrade = students.reduce((groups, { name, score }) => {
  const grade = getGrade(score);
  groups[grade] = [...(groups[grade] || []), name];
  return groups;
}, {});

console.log(byGrade);

for (const grade in byGrade) {
  console.log(`${grade}: ${byGrade[grade].join(", ")}`);
}

const classAverage =
  students.reduce((sum, { score }) => sum + score, 0) / students.length;
console.log("Class average:", classAverage.toFixed(1));

const aboveAverage = students
  .filter(({ score }) => score > classAverage)
  .map(({ name }) => name);
console.log("Above average:", aboveAverage);
