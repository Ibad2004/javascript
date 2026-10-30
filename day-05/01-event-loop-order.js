console.log("1. Sync: script starts");

setTimeout(() => {
  console.log("7. Timer A");
  Promise.resolve().then(() => console.log("8. Promise created inside timer A"));
}, 0);

setTimeout(() => console.log("9. Timer B"), 0);

async function loadProfile() {
  console.log("2. Async function: before await");
  await null;
  console.log("4. Async function: after await");
}

loadProfile();

Promise.resolve().then(() => {
  console.log("5. Promise.then");
  setTimeout(() => console.log("10. Timer created inside a promise"), 0);
});

queueMicrotask(() => console.log("6. queueMicrotask"));

console.log("3. Sync: script ends");
