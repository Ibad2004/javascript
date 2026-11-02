import path from "node:path";
import { config } from "./config.js";
import { fetchJsonWithRetry } from "./fetch-with-retry.js";
import { saveJson } from "./save-json.js";
import { validateUsers, buildSummary } from "./summary.js";

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_SOME_POSTS_FAILED = 2;

const logRetry = (label) => ({ attempt, maxAttempts, reason, delayMs }) => {
  console.log(`  [${label}] Attempt ${attempt}/${maxAttempts} failed (${reason}), retrying in ${delayMs} ms`);
};

async function loadUsers() {
  const url = `${config.baseUrl}/users`;
  console.log(`Fetching users from ${url}`);
  return validateUsers(await fetchJsonWithRetry(url, { onRetry: logRetry("users") }));
}

function loadPostsInParallel(users) {
  console.log(`Fetching posts for ${users.length} users in parallel`);
  return Promise.allSettled(
    users.map((user) =>
      fetchJsonWithRetry(`${config.baseUrl}/posts?userId=${user.id}`, { onRetry: logRetry(`user ${user.id}`) }),
    ),
  );
}

function printSummary(summary) {
  for (const user of summary.users) {
    const posts = user.postCount === null ? "FAILED" : `${user.postCount} posts`;
    console.log(`  ${user.id}. ${user.name}: ${posts}`);
  }
  console.log(
    `Users: ${summary.totalUsers}, posts: ${summary.totalPosts}, average per user: ${summary.averagePostsPerUser}`,
  );
}

async function main() {
  const fetchedAt = new Date();
  let users;
  try {
    users = await loadUsers();
  } catch (error) {
    console.error(`Could not load users: ${error.message}`);
    return EXIT_FAILED;
  }

  const postResults = await loadPostsInParallel(users);
  const summary = buildSummary(users, postResults, fetchedAt);
  printSummary(summary);

  await saveJson(config.outputFile, summary);
  console.log(`Saved to ${path.relative(process.cwd(), config.outputFile)}`);

  if (summary.errors.length > 0) {
    console.error(`Posts failed for ${summary.errors.length} user(s): ${summary.errors.map((e) => e.userId).join(", ")}`);
    return EXIT_SOME_POSTS_FAILED;
  }
  return EXIT_OK;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`Unexpected error: ${error.message}`);
  process.exitCode = EXIT_FAILED;
}
