const round1 = [
  { player: "Ibad", points: 40 },
  { player: "Sara", points: 55 },
  { player: "Ali", points: 30 },
];

const round2 = [
  { player: "Ibad", points: 50 },
  { player: "Sara", points: 20 },
  { player: "Ali", points: 45 },
  { player: "Hina", points: 70 },
];

const allScores = [...round1, ...round2];

const totals = allScores.reduce((result, { player, points }) => {
  result[player] = (result[player] || 0) + points;
  return result;
}, {});

const board = Object.entries(totals)
  .map(([player, total]) => ({ player, total }))
  .sort((a, b) => b.total - a.total);

board.forEach(({ player, total }, index) => {
  console.log(`${index + 1}. ${player.padEnd(5)} ${total}`);
});

const [champion, runnerUp, ...rest] = board;
console.log(`Champion: ${champion.player}`);
console.log(`Runner-up: ${runnerUp.player}`);
console.log(`Others: ${rest.map(({ player }) => player).join(", ")}`);
