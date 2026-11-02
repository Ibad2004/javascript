import { config } from "./config.js";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function userProblems(user, index) {
  if (!isPlainObject(user)) return [`user at index ${index} is not an object`];
  const problems = [];
  if (!Number.isInteger(user.id)) {
    problems.push(`user at index ${index} needs an integer id`);
  }
  if (typeof user.name !== "string" || user.name.trim() === "") {
    problems.push(`user at index ${index} needs a non-empty name`);
  }
  return problems;
}

function duplicateIdProblems(users) {
  const seen = new Set();
  return users.flatMap((user, index) => {
    if (seen.has(user.id)) return [`user at index ${index} repeats id ${user.id}`];
    seen.add(user.id);
    return [];
  });
}

export function validateUsers(users) {
  if (!Array.isArray(users)) {
    throw new TypeError(`users must be an array, got ${users === null ? "null" : typeof users}`);
  }
  const problems = users.flatMap(userProblems);
  if (problems.length === 0) problems.push(...duplicateIdProblems(users));
  if (problems.length > 0) {
    throw new TypeError(`Invalid users:\n- ${problems.join("\n- ")}`);
  }
  return users;
}

function checkSummaryArgs(users, postResults, fetchedAt) {
  validateUsers(users);
  if (!Array.isArray(postResults) || postResults.length !== users.length) {
    throw new TypeError("postResults must be an array with one result per user");
  }
  if (!(fetchedAt instanceof Date) || Number.isNaN(fetchedAt.getTime())) {
    throw new TypeError("fetchedAt must be a valid Date");
  }
}

function postCountOf(result) {
  if (result?.status === "rejected") return { error: result.reason?.message ?? String(result.reason) };
  if (result?.status !== "fulfilled") return { error: "missing posts result" };
  if (!Array.isArray(result.value)) return { error: "posts response is not an array" };
  return { postCount: result.value.length };
}

function toUserRow(user, result) {
  const { postCount = null, error } = postCountOf(result);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      city: user.address?.city ?? null,
      company: user.company?.name ?? null,
      postCount,
    },
    error,
  };
}

const roundTo2 = (value) => Math.round(value * 100) / 100;

export function buildSummary(users, postResults, fetchedAt) {
  checkSummaryArgs(users, postResults, fetchedAt);
  const rows = users.map((user, index) => toUserRow(user, postResults[index]));
  const counts = rows.map((row) => row.user.postCount).filter((count) => typeof count === "number");
  const totalPosts = counts.reduce((sum, count) => sum + count, 0);

  return {
    source: config.baseUrl,
    fetchedAt: fetchedAt.toISOString(),
    totalUsers: users.length,
    totalPosts,
    averagePostsPerUser: counts.length === 0 ? 0 : roundTo2(totalPosts / counts.length),
    users: rows.map((row) => row.user),
    errors: rows.filter((row) => row.error).map((row) => ({ userId: row.user.id, message: row.error })),
  };
}
