import path from "node:path";

export const config = Object.freeze({
  baseUrl: "https://jsonplaceholder.typicode.com",
  maxAttempts: 3,
  timeoutMs: 5000,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  outputFile: path.join(import.meta.dirname, "output", "users-summary.json"),
});
