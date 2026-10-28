let a = 5;
let b = 10;
[a, b] = [b, a];
console.log(a, b);

const getMinMax = (numbers) => [Math.min(...numbers), Math.max(...numbers)];
const [min, max] = getMinMax([42, 7, 19, 88, 3]);
console.log(`Min: ${min}, Max: ${max}`);

const [, second, , fourth] = ["a", "b", "c", "d"];
console.log(second, fourth);

const [first = "none", next = "none"] = ["only one"];
console.log(first, next);

const date = "2026-10-28";
const [year, month, day] = date.split("-");
console.log(`Day ${day}, month ${month}, year ${year}`);

const points = [[0, 0], [3, 4], [6, 8]];
points.forEach(([x, y]) => console.log(`x=${x} y=${y}`));
