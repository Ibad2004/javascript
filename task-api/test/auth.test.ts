import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { signToken } from "../src/auth.js";
import { loadJwtConfig } from "../src/config.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { Task } from "../src/models/Task.js";
import { User } from "../src/models/User.js";

process.env["NODE_ENV"] = "test";
const SECRET = "test-secret-test-secret-test-secret-123";
process.env["JWT_SECRET"] = SECRET;
const app = createApp();
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri("auth-test"));
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

const signup = (email: string, password = "Password123") => request(app).post("/auth/signup").send({ email, password });
const bearer = (token: string): [string, string] => ["Authorization", `Bearer ${token}`];

describe("signup", () => {
  it("201 with user and token, never the hash", async () => {
    const res = await signup("  Ann@Example.com ");
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ann@example.com");
    expect(typeof res.body.token).toBe("string");
    expect(res.text).not.toContain("passwordHash");
    expect(res.body.user._id).toBeUndefined();
  });
  it("409 for a duplicate, also with another letter case", async () => {
    await signup("ann@example.com");
    const res = await signup("ANN@example.com");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Email already registered" });
  });
  it("409 for two signups at the same time", async () => {
    const [a, b] = await Promise.all([signup("race@example.com"), signup("race@example.com")]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
  it("400 for a short password, with fields", async () => {
    const res = await signup("ann@example.com", "short");
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toContain("8 to 72");
  });
});

describe("login", () => {
  it("200 ok; wrong password and unknown email give the same 401", async () => {
    await signup("ann@example.com");
    const ok = await request(app).post("/auth/login").send({ email: "Ann@example.com", password: "Password123" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const wrong = await request(app).post("/auth/login").send({ email: "ann@example.com", password: "nope-nope" });
    const unknown = await request(app).post("/auth/login").send({ email: "who@example.com", password: "nope-nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(wrong.body).toEqual({ error: "Invalid email or password" });
  });
});

describe("protected routes", () => {
  it("/auth/me with and without a token", async () => {
    const { body } = await signup("ann@example.com");
    const ok = await request(app).get("/auth/me").set(...bearer(body.token));
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe("ann@example.com");
    const none = await request(app).get("/auth/me");
    expect(none.status).toBe(401);
    expect(none.body.code).toBe("AUTH_REQUIRED");
    expect((await request(app).get("/tasks")).body.code).toBe("AUTH_REQUIRED");
  });
  it("an expired token is TOKEN_EXPIRED", async () => {
    const { body } = await signup("ann@example.com");
    const expired = jwt.sign({}, SECRET, { algorithm: "HS256", subject: body.user.id, expiresIn: -10 });
    const res = await request(app).get("/tasks").set(...bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Your session expired. Please log in again.", code: "TOKEN_EXPIRED" });
  });
  it("a tampered or wrong-secret token is TOKEN_INVALID", async () => {
    const { body } = await signup("ann@example.com");
    const tampered = `${body.token.slice(0, -2)}xx`;
    const forged = jwt.sign({}, "another-secret-another-secret-12345", { subject: body.user.id });
    for (const token of [tampered, forged]) {
      const res = await request(app).get("/tasks").set(...bearer(token));
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TOKEN_INVALID");
    }
  });
  it("a valid token of a deleted user is 401", async () => {
    const { body } = await signup("ann@example.com");
    await User.deleteMany({});
    expect((await request(app).get("/tasks").set(...bearer(body.token))).status).toBe(401);
  });
});

describe("task ownership", () => {
  it("user A cannot get, patch or delete B's task (404)", async () => {
    const a = (await signup("a@example.com")).body.token as string;
    const b = (await signup("b@example.com")).body.token as string;
    const created = await request(app).post("/tasks").set(...bearer(b)).send({ title: "B only" });
    const id = created.body.id as string;
    expect((await request(app).get(`/tasks/${id}`).set(...bearer(a))).status).toBe(404);
    expect((await request(app).patch(`/tasks/${id}`).set(...bearer(a)).send({ done: true })).status).toBe(404);
    expect((await request(app).delete(`/tasks/${id}`).set(...bearer(a))).status).toBe(404);
    expect((await request(app).get("/tasks").set(...bearer(a))).body).toEqual([]);
    expect((await request(app).get(`/tasks/${id}`).set(...bearer(b))).status).toBe(200);
  });
  it("an owner in the body is ignored", async () => {
    const a = await signup("a@example.com");
    const other = await User.create({ email: "o@example.com", passwordHash: "x" });
    const res = await request(app).post("/tasks").set(...bearer(a.body.token)).send({ title: "t", owner: String(other._id) });
    expect(res.status).toBe(201);
    expect(String((await Task.findById(res.body.id))?.owner)).toBe(a.body.user.id);
    await request(app).patch(`/tasks/${res.body.id}`).set(...bearer(a.body.token)).send({ owner: String(other._id), done: true });
    expect(String((await Task.findById(res.body.id))?.owner)).toBe(a.body.user.id);
  });
});

describe("config", () => {
  it("a missing or short JWT_SECRET is a clear error, without the secret", () => {
    expect(() => loadJwtConfig({})).toThrow("JWT_SECRET is missing");
    expect(() => loadJwtConfig({ JWT_SECRET: "short-secret" })).toThrow(/too short/);
    try {
      loadJwtConfig({ JWT_SECRET: "short-secret" });
    } catch (e) {
      expect((e as Error).message).not.toContain("short-secret");
    }
    expect(loadJwtConfig({ JWT_SECRET: SECRET }).expiresIn).toBe("1h");
    expect(signToken("64b7f0f2a1b2c3d4e5f60718")).toBeTruthy();
  });
});
