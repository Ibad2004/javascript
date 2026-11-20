import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

process.env["NODE_ENV"] = "test";
const app = createApp();
const ok = "http://localhost:5173";

describe("CORS", () => {
  it("allowed origin gets Access-Control-Allow-Origin, Location is exposed", async () => {
    const res = await request(app).get("/health").set("Origin", ok);
    expect(res.headers["access-control-allow-origin"]).toBe(ok);
    expect(res.headers["access-control-expose-headers"]).toContain("Location");
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });
  it("disallowed origin gets no CORS header", async () => {
    const res = await request(app).get("/health").set("Origin", "http://evil.example");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
  it("preflight with Authorization returns 204 and allowed headers", async () => {
    const res = await request(app)
      .options("/tasks")
      .set("Origin", ok)
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "Authorization, Content-Type");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-headers"]).toBe("Content-Type,Authorization");
    expect(res.headers["access-control-allow-methods"]).toBe("GET,POST,PATCH,DELETE,OPTIONS");
    expect(res.headers["access-control-max-age"]).toBe("600");
  });
  it("an error reply (404) to an allowed origin still carries the CORS header", async () => {
    const res = await request(app).get("/nope").set("Origin", ok);
    expect(res.status).toBe(404);
    expect(res.headers["access-control-allow-origin"]).toBe(ok);
  });
  it("no Origin header still works", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
