import { fetchJsonWithRetry } from "./fetch-with-retry.js";

const DEMO_URL = "https://api.example.com/users/1";

const fastRetry = {
  baseDelayMs: 50,
  maxDelayMs: 200,
  onRetry: ({ attempt, maxAttempts, reason, delayMs }) => {
    console.log(`  Attempt ${attempt}/${maxAttempts} failed (${reason}), retrying in ${delayMs} ms`);
  },
};

function scriptedFetch(steps) {
  let calls = 0;
  const fetchFn = async () => {
    const step = steps[calls];
    calls++;
    console.log(`  fetch call ${calls}`);
    return step();
  };
  return { fetchFn, callCount: () => calls };
}

async function run(title, steps) {
  console.log(title);
  const { fetchFn, callCount } = scriptedFetch(steps);
  try {
    const data = await fetchJsonWithRetry(DEMO_URL, { ...fastRetry, fetchFn });
    console.log(`  Success: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    console.log(`  Cause: ${error.cause.message}`);
  }
  console.log(`  fetch was called ${callCount()} time(s)\n`);
}

const serverBusy = () => new Response("Service Unavailable", { status: 503 });
const connectionDropped = () => {
  throw new TypeError("fetch failed");
};
const ok = () => Response.json({ id: 1, name: "Leanne Graham" });
const notFound = () => new Response("Not Found", { status: 404 });

await run("1. 503, then a network error, then success", [serverBusy, connectionDropped, ok]);
await run("2. 404 is NOT retried", [notFound, ok]);
await run("3. Every attempt fails", [serverBusy, serverBusy, serverBusy]);
