// Loads a plain script (no exports), silences console, returns the named bindings and captured logs.
import { readFileSync } from "node:fs";

export function load(url, names, patch = (s) => s) {
  const src = patch(readFileSync(url, "utf8"));
  const logs = [];
  const fakeConsole = { log: (...a) => logs.push(a.join(" ")) };
  const api = new Function("console", `${src}\nreturn { ${names.join(", ")} };`)(fakeConsole);
  return { ...api, logs };
}
