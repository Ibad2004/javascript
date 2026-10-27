function getStats(numbers) {
  if (numbers.length === 0) {
    return null;
  }

  let min = numbers[0];
  let max = numbers[0];
  let sum = 0;

  for (const n of numbers) {
    if (n < min) min = n;
    if (n > max) max = n;
    sum += n;
  }

  return {
    min: min,
    max: max,
    sum: sum,
    average: sum / numbers.length,
  };
}

const temps = [31, 28, 35, 40, 26, 33];
const stats = getStats(temps);

console.log(stats);
console.log(`Hottest: ${stats.max}, Coldest: ${stats.min}`);
console.log(getStats([]));