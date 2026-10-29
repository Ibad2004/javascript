const student = {
  name: "Ibad",
  skills: ["JavaScript", "Python"],

  introduce() {
    return `Hi, I am ${this.name}`;
  },

  addSkill(skill) {
    this.skills.push(skill);
    return `${this.name} now knows ${this.skills.length} skills`;
  },
};

console.log(student.introduce());
console.log(student.addSkill("React"));

const other = { name: "Sara", introduce: student.introduce };
console.log(other.introduce());

const loose = student.introduce;
try {
  console.log(loose());
} catch (error) {
  console.log("Error:", error.message);
}

const fixed = student.introduce.bind(student);
console.log(fixed());

console.log(student.introduce.call({ name: "Ahmed" }));
