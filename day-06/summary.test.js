import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateUsers, buildSummary } from "./summary.js";
import { config } from "./config.js";

const FETCHED_AT = new Date("2026-11-02T10:00:00.000Z");

const user = (id, name = `User ${id}`) => ({
  id,
  name,
  email: `user${id}@example.com`,
  address: { city: `City ${id}` },
  company: { name: `Company ${id}` },
});

const posts = (count) => ({ status: "fulfilled", value: Array.from({ length: count }, (_, i) => ({ id: i + 1 })) });
const failed = (message) => ({ status: "rejected", reason: new Error(message) });

describe("validateUsers", () => {
  test("rejects a value that is not an array", () => {
    for (const users of [undefined, null, {}, "users", 3]) {
      assert.throws(() => validateUsers(users), { name: "TypeError", message: /^users must be an array/ });
    }
  });

  test("accepts an empty array", () => {
    assert.deepEqual(validateUsers([]), []);
  });

  test("rejects a missing or non-integer id", () => {
    for (const id of [undefined, null, "1", 1.5, NaN]) {
      assert.throws(() => validateUsers([{ id, name: "Ann" }]), /user at index 0 needs an integer id/);
    }
  });

  test("rejects a missing or blank name", () => {
    for (const name of [undefined, null, "", "   ", 7]) {
      assert.throws(() => validateUsers([{ id: 1, name }]), /user at index 0 needs a non-empty name/);
    }
  });

  test("rejects items that are not objects", () => {
    for (const item of [null, "Ann", 1, [1, "Ann"]]) {
      assert.throws(() => validateUsers([item]), /user at index 0 is not an object/);
    }
  });

  test("lists every problem in one error", () => {
    assert.throws(() => validateUsers([user(1), { name: "No id" }, { id: 3, name: " " }]), {
      name: "TypeError",
      message: "Invalid users:\n- user at index 1 needs an integer id\n- user at index 2 needs a non-empty name",
    });
  });

  test("rejects repeated ids", () => {
    assert.throws(() => validateUsers([user(1), user(2), user(1)]), /user at index 2 repeats id 1/);
  });
});

describe("buildSummary", () => {
  test("builds the full shape for successful users", () => {
    const summary = buildSummary([user(1), user(2)], [posts(10), posts(4)], FETCHED_AT);
    assert.deepEqual(summary, {
      source: config.baseUrl,
      fetchedAt: "2026-11-02T10:00:00.000Z",
      totalUsers: 2,
      totalPosts: 14,
      averagePostsPerUser: 7,
      users: [
        { id: 1, name: "User 1", email: "user1@example.com", city: "City 1", company: "Company 1", postCount: 10 },
        { id: 2, name: "User 2", email: "user2@example.com", city: "City 2", company: "Company 2", postCount: 4 },
      ],
      errors: [],
    });
  });

  test("empty users gives average 0, not NaN", () => {
    const summary = buildSummary([], [], FETCHED_AT);
    assert.equal(summary.totalUsers, 0);
    assert.equal(summary.totalPosts, 0);
    assert.equal(summary.averagePostsPerUser, 0);
    assert.deepEqual(summary.users, []);
    assert.deepEqual(summary.errors, []);
  });

  test("average is rounded to 2 decimals", () => {
    const summary = buildSummary([user(1), user(2), user(3)], [posts(1), posts(2), posts(2)], FETCHED_AT);
    assert.equal(summary.averagePostsPerUser, 1.67);
  });

  test("partial failure: postCount null, an errors entry, totals skip the failed user", () => {
    const summary = buildSummary(
      [user(1), user(2), user(3)],
      [posts(10), failed("GET /posts?userId=2 failed after 3 attempts. Last reason: HTTP 503"), posts(5)],
      FETCHED_AT,
    );
    assert.equal(summary.totalUsers, 3);
    assert.equal(summary.users.length, 3);
    assert.equal(summary.users[1].postCount, null);
    assert.equal(summary.users[1].name, "User 2");
    assert.equal(summary.totalPosts, 15);
    assert.equal(summary.averagePostsPerUser, 7.5);
    assert.deepEqual(summary.errors, [
      { userId: 2, message: "GET /posts?userId=2 failed after 3 attempts. Last reason: HTTP 503" },
    ]);
  });

  test("every user failed: average 0, all in errors", () => {
    const summary = buildSummary([user(1), user(2)], [failed("a"), failed("b")], FETCHED_AT);
    assert.equal(summary.totalPosts, 0);
    assert.equal(summary.averagePostsPerUser, 0);
    assert.deepEqual(
      summary.errors.map((error) => error.userId),
      [1, 2],
    );
  });

  test("a user with 0 posts counts as 0, not as an error", () => {
    const summary = buildSummary([user(1), user(2)], [posts(0), posts(3)], FETCHED_AT);
    assert.equal(summary.users[0].postCount, 0);
    assert.equal(summary.averagePostsPerUser, 1.5);
    assert.deepEqual(summary.errors, []);
  });

  test("a posts response that is not an array becomes an error", () => {
    const summary = buildSummary([user(1)], [{ status: "fulfilled", value: { posts: [] } }], FETCHED_AT);
    assert.equal(summary.users[0].postCount, null);
    assert.deepEqual(summary.errors, [{ userId: 1, message: "posts response is not an array" }]);
  });

  test("a rejection reason that is not an Error still gives a message", () => {
    const summary = buildSummary([user(1)], [{ status: "rejected", reason: "offline" }], FETCHED_AT);
    assert.deepEqual(summary.errors, [{ userId: 1, message: "offline" }]);
  });

  test("missing email, address or company become null", () => {
    const summary = buildSummary([{ id: 5, name: "Bare" }], [posts(1)], FETCHED_AT);
    assert.deepEqual(summary.users[0], {
      id: 5,
      name: "Bare",
      email: null,
      city: null,
      company: null,
      postCount: 1,
    });
  });

  test("rejects invalid users, mismatched results and a bad date", () => {
    assert.throws(() => buildSummary(null, [], FETCHED_AT), /users must be an array/);
    assert.throws(() => buildSummary([user(1)], [], FETCHED_AT), /one result per user/);
    assert.throws(() => buildSummary([user(1)], null, FETCHED_AT), /one result per user/);
    assert.throws(() => buildSummary([], [], "2026-11-02"), /fetchedAt must be a valid Date/);
    assert.throws(() => buildSummary([], [], new Date("nope")), /fetchedAt must be a valid Date/);
  });
});
