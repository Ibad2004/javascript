const team = {
  name: "Frontend Team",
  members: ["Ibad", "Sara", "Ali"],

  listWithArrow() {
    return this.members.map((member) => `${member} is in ${this.name}`);
  },

  listWithRegular() {
    return this.members.map(function (member) {
      return `${member} is in ${this ? this.name : "undefined"}`;
    });
  },

  arrowMethod: () => {
    return `arrowMethod sees this = ${this}`;
  },
};

console.log(team.listWithArrow());
console.log(team.listWithRegular());
console.log(team.arrowMethod());

const timer = {
  seconds: 0,
  start() {
    const id = setInterval(() => {
      this.seconds++;
      console.log(`Tick ${this.seconds}`);
      if (this.seconds === 3) clearInterval(id);
    }, 100);
  },
};

timer.start();
