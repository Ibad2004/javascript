import express, { type Express, type Router } from "express";
import { errorHandler, notFound, requestLogger } from "./middleware.js";
import { tasksRouter } from "./routes.js";

/** `extraRoutes` is only for tests (to mount a route that throws). */
export function createApp(extraRoutes?: (router: Router) => void): Express {
  const app = express();
  app.disable("x-powered-by");

  // 1 first, so it times every request, even ones that fail later.
  app.use(requestLogger);
  // 2 before any route that reads req.body; it also rejects bad or oversized JSON.
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  // 3 after the body is parsed; the first match answers the request.
  app.use("/tasks", tasksRouter);
  if (extraRoutes) {
    const router = express.Router();
    extraRoutes(router);
    app.use("/_test", router);
  }

  // 4 after every route: only requests nothing else answered get here.
  app.use(notFound);
  // 5 last, because an error handler only catches errors from middleware registered before it.
  app.use(errorHandler);
  return app;
}
