const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fakeUsers = new Map([[1, { id: 1, name: "Leanne Graham" }]]);

async function getUser(id) {
  await wait(50);
  const user = fakeUsers.get(id);
  if (!user) throw new Error(`User ${id} not found`);
  return user;
}

async function stateOf(promise) {
  const notSettled = Symbol("not settled");
  try {
    const value = await Promise.race([promise, notSettled]);
    return value === notSettled ? "pending" : `fulfilled with ${JSON.stringify(value)}`;
  } catch (error) {
    return `rejected with "${error.message}"`;
  }
}

async function showStates() {
  console.log("1. The 3 states of a promise");
  const loading = wait(50).then(() => "data");
  const ready = Promise.resolve("ready");
  const failed = Promise.reject(new Error("server down"));
  console.log(`  loading: ${await stateOf(loading)}`);
  console.log(`  ready:   ${await stateOf(ready)}`);
  console.log(`  failed:  ${await stateOf(failed)}`);
  await loading;
  console.log(`  loading after 50 ms: ${await stateOf(loading)}`);
}

function withThenCatch(id) {
  return getUser(id)
    .then((user) => console.log(`  .then  -> found ${user.name}`))
    .catch((error) => console.log(`  .catch -> ${error.message}`));
}

async function withAwait(id) {
  try {
    const user = await getUser(id);
    console.log(`  await -> found ${user.name}`);
  } catch (error) {
    console.log(`  catch -> ${error.message}`);
  }
}

async function showThenVsAwait() {
  console.log("2. .then/.catch vs async/await (same result)");
  await withThenCatch(1);
  await withThenCatch(99);
  await withAwait(1);
  await withAwait(99);
}

async function loadProfile(id) {
  console.log(`  spinner on (user ${id})`);
  try {
    const user = await getUser(id);
    console.log(`  show profile of ${user.name}`);
  } catch (error) {
    console.log(`  show error: ${error.message}`);
  } finally {
    console.log("  spinner off");
  }
}

async function showFinally() {
  console.log("3. try/catch/finally: finally runs on success and on failure");
  await loadProfile(1);
  await loadProfile(99);
}

async function showRejected() {
  console.log("4. A rejected promise");
  const rejected = Promise.reject(new Error("payment declined"));
  const handled = await rejected.catch((error) => `handled: ${error.message}`);
  console.log(`  ${handled}`);
  console.log(`  state of the original promise: ${await stateOf(rejected)}`);
}

async function showAwaitPausesOnlyItsFunction() {
  console.log("5. await pauses only its own async function");
  const task = (async () => {
    console.log("  inside: before await");
    await wait(50);
    console.log("  inside: after await");
  })();
  console.log("  outside: still running while the function waits");
  await task;
}

await showStates();
await showThenVsAwait();
await showFinally();
await showRejected();
await showAwaitPausesOnlyItsFunction();
