const REQUEST_MS = 300;

const roundTo100 = (ms) => Math.round(ms / 100) * 100;

const fakeRequest = (name, { fails = false } = {}) =>
  new Promise((resolve, reject) => {
    setTimeout(() => (fails ? reject(new Error(`${name} failed`)) : resolve(`${name} data`)), REQUEST_MS);
  });

async function timed(label, task) {
  const startedAt = performance.now();
  try {
    const result = await task();
    console.log(`${label}: ${roundTo100(performance.now() - startedAt)} ms`);
    return result;
  } catch (error) {
    console.log(`${label}: rejected after ${roundTo100(performance.now() - startedAt)} ms with "${error.message}"`);
    return null;
  }
}

async function oneByOne() {
  const user = await fakeRequest("user");
  const posts = await fakeRequest("posts");
  const comments = await fakeRequest("comments");
  return [user, posts, comments];
}

function allAtOnce() {
  return Promise.all([fakeRequest("user"), fakeRequest("posts"), fakeRequest("comments")]);
}

function allAtOnceWithFailure() {
  return Promise.all([fakeRequest("user"), fakeRequest("posts", { fails: true }), fakeRequest("comments")]);
}

function allSettledWithFailure() {
  return Promise.allSettled([fakeRequest("user"), fakeRequest("posts", { fails: true }), fakeRequest("comments")]);
}

const describeSettled = (result) =>
  result.status === "fulfilled" ? `fulfilled: ${result.value}` : `rejected: ${result.reason.message}`;

console.log(`3 fake requests, ${REQUEST_MS} ms each\n`);

await timed("1. await one by one", oneByOne);
await timed("2. Promise.all", allAtOnce);
await timed("3. Promise.all, posts fails", allAtOnceWithFailure);

const settled = await timed("4. Promise.allSettled, posts fails", allSettledWithFailure);
for (const result of settled) {
  console.log(`   ${describeSettled(result)}`);
}
