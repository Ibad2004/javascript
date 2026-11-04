import { config } from "./config.js";
import { isObject, isUnknownArray, messageOf } from "./guards.js";

export interface ApiUser {
  readonly id: number;
  readonly name: string;
  readonly email?: unknown;
  readonly address?: unknown;
  readonly company?: unknown;
}

export interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly email: string | null;
  readonly city: string | null;
  readonly company: string | null;
  readonly postCount: number | null;
}

export interface SummaryError {
  readonly userId: number;
  readonly message: string;
}

export interface UsersSummary {
  readonly source: string;
  readonly fetchedAt: string;
  readonly totalUsers: number;
  readonly totalPosts: number;
  readonly averagePostsPerUser: number;
  readonly users: readonly UserRow[];
  readonly errors: readonly SummaryError[];
}

type PostsOutcome = { readonly postCount: number } | { readonly error: string };

interface RowResult {
  readonly user: UserRow;
  readonly error: string | null;
}

const isWholeNumber = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);

const isNonBlankString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

function userProblems(user: unknown, index: number): string[] {
  if (!isObject(user)) return [`user at index ${index} is not an object`];
  const problems: string[] = [];
  if (!("id" in user) || !isWholeNumber(user.id)) {
    problems.push(`user at index ${index} needs an integer id`);
  }
  if (!("name" in user) || !isNonBlankString(user.name)) {
    problems.push(`user at index ${index} needs a non-empty name`);
  }
  return problems;
}

export const isApiUser = (value: unknown): value is ApiUser => userProblems(value, 0).length === 0;

function duplicateIdProblems(users: readonly ApiUser[]): string[] {
  const seen = new Set<number>();
  return users.flatMap((user, index) => {
    if (seen.has(user.id)) return [`user at index ${index} repeats id ${user.id}`];
    seen.add(user.id);
    return [];
  });
}

export function validateUsers(users: unknown): ApiUser[] {
  if (!isUnknownArray(users)) {
    throw new TypeError(`users must be an array, got ${users === null ? "null" : typeof users}`);
  }
  const problems = users.flatMap(userProblems);
  const validUsers = users.filter(isApiUser);
  if (problems.length === 0) problems.push(...duplicateIdProblems(validUsers));
  if (problems.length > 0) {
    throw new TypeError(`Invalid users:\n- ${problems.join("\n- ")}`);
  }
  return validUsers;
}

export function checkSummaryArgs(users: unknown, postResults: unknown, fetchedAt: unknown): void {
  const checkedUsers = validateUsers(users);
  if (!isUnknownArray(postResults) || postResults.length !== checkedUsers.length) {
    throw new TypeError("postResults must be an array with one result per user");
  }
  if (!(fetchedAt instanceof Date) || Number.isNaN(fetchedAt.getTime())) {
    throw new TypeError("fetchedAt must be a valid Date");
  }
}

function postCountOf(result: PromiseSettledResult<unknown> | undefined): PostsOutcome {
  if (result === undefined) return { error: "missing posts result" };
  if (result.status === "rejected") return { error: messageOf(result.reason) };
  if (!isUnknownArray(result.value)) return { error: "posts response is not an array" };
  return { postCount: result.value.length };
}

const cityOf = (address: unknown): string | null =>
  isObject(address) && "city" in address ? stringOrNull(address.city) : null;

const companyNameOf = (company: unknown): string | null =>
  isObject(company) && "name" in company ? stringOrNull(company.name) : null;

function toUserRow(user: ApiUser, result: PromiseSettledResult<unknown> | undefined): RowResult {
  const outcome = postCountOf(result);
  const row: UserRow = {
    id: user.id,
    name: user.name,
    email: stringOrNull(user.email),
    city: cityOf(user.address),
    company: companyNameOf(user.company),
    postCount: "postCount" in outcome ? outcome.postCount : null,
  };
  return { user: row, error: "error" in outcome ? outcome.error : null };
}

const toSummaryErrors = (rows: readonly RowResult[]): SummaryError[] =>
  rows.flatMap(({ user, error }) => (error === null ? [] : [{ userId: user.id, message: error }]));

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

export function buildSummary(
  users: readonly ApiUser[],
  postResults: readonly PromiseSettledResult<unknown>[],
  fetchedAt: Date,
): UsersSummary {
  checkSummaryArgs(users, postResults, fetchedAt);
  const rows = users.map((user, index) => toUserRow(user, postResults[index]));
  const counts = rows.map((row) => row.user.postCount).filter((count) => count !== null);
  const totalPosts = counts.reduce((sum, count) => sum + count, 0);

  return {
    source: config.baseUrl,
    fetchedAt: fetchedAt.toISOString(),
    totalUsers: users.length,
    totalPosts,
    averagePostsPerUser: counts.length === 0 ? 0 : roundTo2(totalPosts / counts.length),
    users: rows.map((row) => row.user),
    errors: toSummaryErrors(rows),
  };
}
