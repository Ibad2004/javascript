import { debounce } from "./debounce.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function searchBoxDemo() {
  console.log("(a) Search box, wait 300 ms");
  const search = debounce((query) => console.log(`  Searching for "${query}"`), 300);

  let typed = "";
  for (const letter of "laptop") {
    typed += letter;
    console.log(`  Typed: ${typed}`);
    search(typed);
    await sleep(100);
  }
  await sleep(400);
}

async function formSubmitDemo() {
  console.log("(b) Submit button, leading: true, trailing: false");
  const form = {
    name: "Signup form",
    submits: 0,
    submit: debounce(
      function () {
        this.submits++;
        console.log(`  ${this.name} submitted`);
      },
      1000,
      { leading: true, trailing: false },
    ),
  };

  form.submit();
  form.submit();
  form.submit();
  console.log(`  Clicks: 3, submits: ${form.submits}`);
  form.submit.cancel();
}

function autosaveDemo() {
  console.log("(c) Autosave with flush()");
  const saveDraft = debounce((text) => {
    console.log(`  Saved draft: "${text}"`);
    return text.length;
  }, 2000);

  saveDraft("Hello");
  saveDraft("Hello wor");
  saveDraft("Hello world");
  console.log(`  Pending before flush: ${saveDraft.pending()}`);
  const savedLength = saveDraft.flush();
  console.log(`  flush() returned ${savedLength}, pending after flush: ${saveDraft.pending()}`);
}

async function cancelDemo() {
  console.log("(d) Tooltip with cancel()");
  const showTooltip = debounce(() => console.log("  Tooltip shown"), 500);

  showTooltip();
  console.log(`  Pending: ${showTooltip.pending()}`);
  showTooltip.cancel();
  console.log(`  After cancel, pending: ${showTooltip.pending()}`);
  await sleep(600);
  console.log("  Tooltip never appeared");
}

await searchBoxDemo();
await formSubmitDemo();
autosaveDemo();
await cancelDemo();
