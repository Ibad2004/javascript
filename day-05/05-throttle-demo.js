import { throttle } from "./throttle.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrollDemo() {
  console.log("(a) 10 scroll events, one every 100 ms, throttle wait 330 ms");
  const onScroll = throttle((eventNumber) => console.log(`    Handled scroll #${eventNumber}`), 330);

  for (let eventNumber = 0; eventNumber < 10; eventNumber++) {
    setTimeout(() => {
      console.log(`  Scroll event #${eventNumber}`);
      onScroll(eventNumber);
    }, eventNumber * 100);
  }
  await sleep(1200);
}

async function shootDemo() {
  console.log("(b) Shoot button, leading only, wait 1000 ms");
  const player = {
    shots: 0,
    shoot: throttle(
      function () {
        this.shots++;
      },
      1000,
      { trailing: false },
    ),
  };

  for (let click = 0; click < 5; click++) {
    player.shoot();
  }
  console.log(`  5 fast clicks -> shots: ${player.shots}`);

  await sleep(1100);
  player.shoot();
  console.log(`  1 click 1.1 s later -> shots: ${player.shots}`);
}

await scrollDemo();
await shootDemo();
