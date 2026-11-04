import { fetchJsonWithRetry, type FetchFn, type RetryOptions } from "./fetch-with-retry.js";
import { messageOf } from "./guards.js";

type Step = () => Response | Promise<Response>;

const DEMO_URL = "https://api.example.com/users/1";

const fastRetry: RetryOptions = {
  baseDelayMs: 50,
  maxDelayMs: 200,
  onRetry: ({ attempt, maxAttempts, reason, delayMs }) => {
    console.log(`  Attempt ${attempt}/${maxAttempts} failed (${reason}), retrying in ${delayMs} ms`);
  },
};

function scriptedFetch(steps: readonly Step[]) {
  let calls = 0;
  const fetchFn: FetchFn = async () => {
    const step = steps[calls];
    calls++;
    console.log(`  fetch call ${calls}`);
    if (step === undefined) throw new Error(`no scripted step for call ${calls}`);
    return step();
  };
  return { fetchFn, callCount: () => calls };
}

const causeMessage = (error: unknown): string => (error instanceof Error ? messageOf(error.cause) : "none");

async function run(title: string, steps: readonly Step[]): Promise<void> {
  console.log(title);
  const { fetchFn, callCount } = scriptedFetch(steps);
  try {
    const data = await fetchJsonWithRetry(DEMO_URL, { ...fastRetry, fetchFn });
    console.log(`  Success: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`  Error: ${messageOf(error)}`);
    console.log(`  Cause: ${causeMessage(error)}`);
  }
  console.log(`  fetch was called ${callCount()} time(s)\n`);
}

const serverBusy: Step = () => new Response("Service Unavailable", { status: 503 });
const connectionDropped: Step = () => {
  throw new TypeError("fetch failed");
};
const ok: Step = () => Response.json({ id: 1, name: "Leanne Graham" });
const notFound: Step = () => new Response("Not Found", { status: 404 });

await run("1. 503, then a network error, then success", [serverBusy, connectionDropped, ok]);
await run("2. 404 is NOT retried", [notFound, ok]);
await run("3. Every attempt fails", [serverBusy, serverBusy, serverBusy]);
