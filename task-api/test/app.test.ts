import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { Task } from "../src/models/Task.js";
import { sampleTasks } from "../src/sampleTasks.js";

process.env["NODE_ENV"] = "test";
const app = createApp((router) => {
  router.get("/boom", () => {
    throw new Error("secret internal detail");
  });
  router.get("/boom-async", async () => {
    await Promise.resolve();
    throw new Error("async secret");
  });
});

let mongod: MongoMemoryServer;
let ids: string[] = [];
const FAKE_ID = "64b7f0f2a1b2c3d4e5f60718";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri("task-test"));
  await Task.init();
}, 120_000);

afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});

beforeEach(async () => {
  await Task.deleteMany({});
  const docs = await Task.insertMany(sampleTasks);
  ids = docs.map((d) => d.id as string);
});

describe("health and 404", () => {
  it("GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
  it("unknown route is a JSON 404", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Route not found" });
  });
});

describe("GET /tasks", () => {
  it("lists the seed tasks", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });
  it("gets one task, 404 for an unknown id", async () => {
    const ok = await request(app).get(`/tasks/${ids[0]}`);
    expect(ok.status).toBe(200);
    expect(ok.body.id).toBe(ids[0]);
    const missing = await request(app).get(`/tasks/${FAKE_ID}`);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "Task not found" });
  });
});

describe("POST /tasks", () => {
  it("creates with defaults, 201 and Location", async () => {
    const res = await request(app).post("/tasks").send({ title: "  New  " });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "New", description: "", priority: "medium", dueDate: null, done: false });
    expect(res.headers["location"]).toBe(`/tasks/${res.body.id}`);
    expect((await request(app).get(`/tasks/${res.body.id}`)).status).toBe(200);
  });
  it("ignores unknown fields and a client id", async () => {
    const res = await request(app).post("/tasks").send({ title: "x", id: "hack", extra: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe("hack");
    expect(res.body.extra).toBeUndefined();
  });
  it.each([
    ["empty title", { title: "   " }, "title"],
    ["too long title", { title: "a".repeat(101) }, "title"],
    ["title not a string", { title: 5 }, "title"],
    ["bad priority", { title: "x", priority: "urgent" }, "priority"],
    ["bad date format", { title: "x", dueDate: "16/11/2026" }, "dueDate"],
    ["impossible date", { title: "x", dueDate: "2026-02-30" }, "dueDate"],
    ["long description", { title: "x", description: "a".repeat(501) }, "description"],
  ])("400 for %s", async (_name, body, field) => {
    const res = await request(app).post("/tasks").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(field);
  });
});

describe("PATCH /tasks/:id", () => {
  it("changes only the sent fields and never the id", async () => {
    const res = await request(app).patch(`/tasks/${ids[1]}`).send({ done: true, id: "other" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: ids[1], done: true, title: "Write the middleware order" });
  });
  it("400 for an empty patch, 404 for an unknown id", async () => {
    expect((await request(app).patch(`/tasks/${ids[1]}`).send({})).status).toBe(400);
    expect((await request(app).patch(`/tasks/${FAKE_ID}`).send({ done: true })).status).toBe(404);
  });
});

describe("DELETE /tasks/:id", () => {
  it("204 then 404", async () => {
    expect((await request(app).delete(`/tasks/${ids[0]}`)).status).toBe(204);
    expect((await request(app).delete(`/tasks/${ids[0]}`)).status).toBe(404);
  });
});

describe("MongoDB features", () => {
  it("an invalid ObjectId is 404, never 500", async () => {
    for (const verb of ["get", "delete"] as const) {
      const res = await request(app)[verb]("/tasks/999");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Task not found" });
    }
    expect((await request(app).patch("/tasks/not-an-id").send({ done: true })).status).toBe(404);
  });
  it("tags are embedded, trimmed and de-duplicated", async () => {
    const res = await request(app).post("/tasks").send({ title: "t", tags: [" a ", "a", "b"] });
    expect(res.status).toBe(201);
    expect(res.body.tags).toEqual(["a", "b"]);
    const patched = await request(app).patch(`/tasks/${res.body.id}`).send({ tags: ["x"] });
    expect(patched.body.tags).toEqual(["x"]);
  });
  it("400 for too many or too long tags", async () => {
    const many = await request(app).post("/tasks").send({ title: "t", tags: Array.from({ length: 11 }, (_, i) => `t${i}`) });
    expect(many.status).toBe(400);
    expect(many.body.error).toContain("tags");
    const long = await request(app).post("/tasks").send({ title: "t", tags: ["a".repeat(21)] });
    expect(long.status).toBe(400);
  });
  it("the model rejects bad data with a 400 naming the field", async () => {
    const res = await Task.create({ title: "ok", tags: ["a", "a"] }).catch((e: Error) => e);
    expect(res).toBeInstanceOf(Error);
    expect((res as Error).message).toContain("tags");
  });
  it("toJSON has id and no _id or __v", async () => {
    const res = await request(app).get(`/tasks/${ids[0]}`);
    expect(typeof res.body.id).toBe("string");
    expect(res.body._id).toBeUndefined();
    expect(res.body.__v).toBeUndefined();
  });
  it("data survives a new app instance", async () => {
    const created = await request(app).post("/tasks").send({ title: "persist" });
    const again = await request(createApp()).get(`/tasks/${created.body.id}`);
    expect(again.status).toBe(200);
    expect(again.body.title).toBe("persist");
  });
});

describe("error handler", () => {
  it("invalid JSON is 400", async () => {
    const res = await request(app).post("/tasks").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "The body must be valid JSON" });
  });
  it("too large is 413", async () => {
    const res = await request(app).post("/tasks").send({ title: "x", description: "a".repeat(11000) });
    expect(res.status).toBe(413);
  });
  it("missing or non-JSON body is 400", async () => {
    const none = await request(app).post("/tasks");
    expect(none.body).toEqual({ error: "Send the task as JSON" });
    const text = await request(app).post("/tasks").set("Content-Type", "text/plain").send("hi");
    expect(text.status).toBe(400);
  });
  it("a thrown error is 500 without a stack", async () => {
    for (const path of ["/_test/boom", "/_test/boom-async"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Something went wrong" });
      expect(res.text).not.toContain("secret");
      expect(res.text).not.toContain("at ");
    }
  });
});

describe("database disconnected", () => {
  it("503 on /tasks, /health still 200", async () => {
    await disconnectDb();
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "Database unavailable, try again shortly" });
    expect((await request(app).get("/health")).status).toBe(200);
  });
});
