import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { signToken } from "../src/auth.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { mondayOf, todayIn } from "../src/stats.js";
import { Task } from "../src/models/Task.js";
import { User } from "../src/models/User.js";

process.env["NODE_ENV"] = "test";
process.env["JWT_SECRET"] = "test-secret-test-secret-test-secret-123";
const app = createApp();
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri("stats-test"));
  await User.init();
}, 120_000);
afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});
beforeEach(async () => {
  await Task.deleteMany({});
  await User.deleteMany({});
});

async function makeUser(email: string, role: "user" | "admin" = "user") {
  const u = await User.create({ email, passwordHash: "x", role });
  return { id: u._id, auth: ["Authorization", `Bearer ${signToken(u.id)}`] as [string, string] };
}
/** Inserts straight into the collection so createdAt can be set. */
const addTasks = (owner: mongoose.Types.ObjectId, rows: { done?: boolean; dueDate?: string | null; priority?: string; createdAt?: Date }[]) =>
  Task.collection.insertMany(rows.map((r, i) => ({ owner, title: `t${i}`, description: "", priority: "medium", dueDate: null, done: false, tags: [], createdAt: new Date(), updatedAt: new Date(), ...r })));

describe("GET /stats", () => {
  it("counts status incl. overdue and priority, only for me", async () => {
    const me = await makeUser("me@example.com");
    const other = await makeUser("other@example.com");
    await addTasks(me.id, [
      { dueDate: "2000-01-01" }, // overdue
      { dueDate: "2000-01-01", done: true }, // done, so not overdue
      { dueDate: "2999-01-01", priority: "high" }, // future
      { priority: "low" }, // no due date
    ]);
    await addTasks(other.id, [{ dueDate: "2000-01-01" }, { done: true }]);
    const res = await request(app).get("/stats").set(...me.auth);
    expect(res.status).toBe(200);
    expect(res.body.byStatus).toEqual({ total: 4, done: 1, pending: 3, overdue: 1 });
    expect(res.body.byPriority).toEqual({ low: 1, medium: 2, high: 1 });
  });
  it("a user with 0 tasks gets zeros and 8 empty weeks", async () => {
    const me = await makeUser("me@example.com");
    const res = await request(app).get("/stats").set(...me.auth);
    expect(res.body.byStatus).toEqual({ total: 0, done: 0, pending: 0, overdue: 0 });
    expect(res.body.byPriority).toEqual({ low: 0, medium: 0, high: 0 });
    expect(res.body.byWeek).toHaveLength(8);
    expect(res.body.byWeek.every((w: { count: number }) => w.count === 0)).toBe(true);
  });
  it("fills week gaps with 0, oldest first, last week is this Monday", async () => {
    const me = await makeUser("me@example.com");
    const monday = mondayOf(todayIn("UTC"));
    await addTasks(me.id, [{ createdAt: new Date(`${mondayOf(monday, 3)}T12:00:00Z`) }, { createdAt: new Date() }, { createdAt: new Date(`${mondayOf(monday, 20)}T12:00:00Z`) }]);
    const { byWeek } = (await request(app).get("/stats").set(...me.auth)).body as { byWeek: { week: string; count: number }[] };
    expect(byWeek.map((w) => w.count)).toEqual([0, 0, 0, 0, 1, 0, 0, 1]);
    expect(byWeek[7]?.week).toBe(monday);
    expect(byWeek.map((w) => w.week)).toEqual([...byWeek.map((w) => w.week)].sort());
  });
  it("time zone edge: Sunday 23:30 in Karachi stays in that week; UTC groups Monday 02:00 Karachi into the old week", async () => {
    const me = await makeUser("me@example.com");
    const monday = mondayOf(todayIn("Asia/Karachi"));
    const prev = mondayOf(monday, 1);
    const sunday = new Date(new Date(`${monday}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
    await addTasks(me.id, [
      { createdAt: new Date(`${sunday}T18:30:00Z`) }, // Sunday 23:30 in Karachi
      { createdAt: new Date(`${sunday}T21:00:00Z`) }, // Monday 02:00 in Karachi, still Sunday in UTC
    ]);
    const get = async (tz: string) => ((await request(app).get(`/stats?tz=${tz}`).set(...me.auth)).body.byWeek as { week: string; count: number }[]);
    const pk = await get("Asia/Karachi");
    expect(pk.find((w) => w.week === prev)?.count).toBe(1);
    expect(pk.find((w) => w.week === monday)?.count).toBe(1);
    const utc = await get("UTC");
    expect(utc.find((w) => w.week === mondayOf(sunday))?.count).toBe(2);
  });
  it("400 for a bad tz, 401 without a token", async () => {
    const me = await makeUser("me@example.com");
    const bad = await request(app).get("/stats?tz=Mars/Base").set(...me.auth);
    expect(bad.status).toBe(400);
    expect(bad.body.fields.tz).toContain("IANA");
    expect((await request(app).get("/stats")).status).toBe(401);
  });
});

describe("GET /stats/users", () => {
  it("admin 200 with a 0-task user, sorted, no hashes", async () => {
    const admin = await makeUser("admin@example.com", "admin");
    const busy = await makeUser("busy@example.com");
    await makeUser("idle@example.com");
    await addTasks(busy.id, [{ done: true }, {}]);
    const res = await request(app).get("/stats/users").set(...admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { email: string; total: number; done: number; pending: number }) => [u.email, u.total, u.done, u.pending])).toEqual([
      ["busy@example.com", 2, 1, 1],
      ["admin@example.com", 0, 0, 0],
      ["idle@example.com", 0, 0, 0],
    ]);
    expect(res.text).not.toContain("passwordHash");
  });
  it("403 for a normal user, 401 without a token", async () => {
    const me = await makeUser("me@example.com");
    const res = await request(app).get("/stats/users").set(...me.auth);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Admins only", code: "FORBIDDEN" });
    expect((await request(app).get("/stats/users")).status).toBe(401);
  });
  it("role cannot be set at signup", async () => {
    const res = await request(app).post("/auth/signup").send({ email: "sneaky@example.com", password: "Password123", role: "admin" });
    expect(res.status).toBe(201);
    expect((await User.findOne({ email: "sneaky@example.com" }))?.role).toBe("user");
  });
});
