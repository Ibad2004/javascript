import { messageOf } from "./guards.js";

const REQUEST_MS = 300;

interface RequestOptions {
  readonly fails?: boolean;
}

const roundTo100 = (ms: number): number => Math.round(ms / 100) * 100;

const fakeRequest = (name: string, { fails = false }: RequestOptions = {}): Promise<string> =>
  new Promise((resolve, reject) => {
    setTimeout(() => (fails ? reject(new Error(`${name} failed`)) : resolve(`${name} data`)), REQUEST_MS);
  });

async function timed<T>(label: string, task: () => Promise<T>): Promise<T | null> {
  const startedAt = performance.now();
  try {
    const result = await task();
    console.log(`${label}: ${roundTo100(performance.now() - startedAt)} ms`);
    return result;
  } catch (error) {
    console.log(`${label}: rejected after ${roundTo100(performance.now() - startedAt)} ms with "${messageOf(error)}"`);
    return null;
  }
}

async function oneByOne(): Promise<string[]> {
  const user = await fakeRequest("user");
  const posts = await fakeRequest("posts");
  const comments = await fakeRequest("comments");
  return [user, posts, comments];
}

function allAtOnce(): Promise<string[]> {
  return Promise.all([fakeRequest("user"), fakeRequest("posts"), fakeRequest("comments")]);
}

function allAtOnceWithFailure(): Promise<string[]> {
  return Promise.all([fakeRequest("user"), fakeRequest("posts", { fails: true }), fakeRequest("comments")]);
}

function allSettledWithFailure(): Promise<PromiseSettledResult<string>[]> {
  return Promise.allSettled([fakeRequest("user"), fakeRequest("posts", { fails: true }), fakeRequest("comments")]);
}

const describeSettled = (result: PromiseSettledResult<string>): string =>
  result.status === "fulfilled" ? `fulfilled: ${result.value}` : `rejected: ${messageOf(result.reason)}`;

console.log(`3 fake requests, ${REQUEST_MS} ms each\n`);

await timed("1. await one by one", oneByOne);
await timed("2. Promise.all", allAtOnce);
await timed("3. Promise.all, posts fails", allAtOnceWithFailure);

const settled = await timed("4. Promise.allSettled, posts fails", allSettledWithFailure);
for (const result of settled ?? []) {
  console.log(`   ${describeSettled(result)}`);
}
