const getGrade = (score) => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

const students = [
  { name: "Ibad", score: 88 },
  { name: "Sara", score: 95 },
  { name: "Ahmed", score: 72 },
  { name: "Zara", score: 54 },
];

let topper = students[0];

for (const student of students) {
  const grade = getGrade(student.score);
  console.log(`${student.name.padEnd(6)} ${student.score}  ${grade}`);

  if (student.score > topper.score) {
    topper = student;
  }
}

console.log(`Topper: ${topper.name} with ${topper.score}`);