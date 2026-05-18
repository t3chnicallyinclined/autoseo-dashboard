import express from "express";
import cors from "cors";
import { jobsRouter } from "./jobs.js";
import { clipsRouter } from "./clips.js";
import { analyticsRouter } from "./analytics.js";
import { trendsRouter } from "./routes/trends.js";
import { getDb, closeDb } from "./db.js";

export function createApp() {
  const db = getDb();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/jobs", jobsRouter);
  app.use("/api/clips", clipsRouter);
  app.use("/api/analytics", analyticsRouter(db));
  app.use("/api/trends", trendsRouter);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.API_PORT ?? "3001", 10);
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
  process.on("SIGTERM", () => {
    closeDb();
    server.close();
  });
}
