import cors from "cors";
import express, { type Express, type Router } from "express";
import { loadCorsOrigins } from "./config.js";
import { errorHandler, notFound, requestLogger } from "./middleware.js";
import { authRouter } from "./authRoutes.js";
import { tasksRouter } from "./routes.js";
import { statsRouter } from "./stats.js";

/** `extraRoutes` is only for tests (to mount a route that throws). */
export function createApp(extraRoutes?: (router: Router) => void): Express {
  const app = express();
  app.disable("x-powered-by");

  // 1 CORS first, so EVERY reply (400/401/403/404/500 too) carries the CORS header
  // and answers preflight OPTIONS before auth or the body parser see it.
  const origins = loadCorsOrigins();
  app.use(
    cors({
      // Listed origins only. Others get no CORS headers (the browser blocks them).
      // No Origin header (curl, PowerShell) is allowed through.
      origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Location"],
      credentials: false,
      maxAge: 600,
      optionsSuccessStatus: 204,
    }),
  );
  // 2 next, so it times every request, even ones that fail later.
  app.use(requestLogger);
  // 3 before any route that reads req.body; it also rejects bad or oversized JSON.
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  // 4 after the body is parsed; the first match answers the request.
  app.use("/auth", authRouter);
  app.use("/tasks", tasksRouter);
  app.use("/stats", statsRouter);
  if (extraRoutes) {
    const router = express.Router();
    extraRoutes(router);
    app.use("/_test", router);
  }

  // 5 after every route: only requests nothing else answered get here.
  app.use(notFound);
  // 6 last, because an error handler only catches errors from middleware registered before it.
  app.use(errorHandler);
  return app;
}
