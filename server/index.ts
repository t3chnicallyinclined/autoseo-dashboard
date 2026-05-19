import express, { type Express } from "express";
import cors from "cors";
import type Database from "better-sqlite3";
import { jobsRouter } from "./jobs.js";
import { clipsRouter } from "./clips.js";
import { analyticsRouter } from "./analytics.js";
import { trendsRouter } from "./routes/trends.js";
import platformsRouter from "./routes/platforms.js";
import postsRouter from "./routes/posts.js";
import { getDb, createDb, setDb, closeDb } from "./db.js";

export interface CreatedApp {
  app: Express;
  db: Database.Database;
}

/**
 * Build the Express app. With no args, uses the singleton DB at CLIPPER_DB.
 * Pass an explicit dbPath (or `:memory:`) for tests to get an isolated DB.
 */
export function createApp(dbPath?: string): CreatedApp {
  const db = dbPath !== undefined ? createDb(dbPath) : getDb();
  if (dbPath !== undefined) setDb(db);
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/jobs", jobsRouter);
  app.use("/api/clips", clipsRouter);
  app.use("/api/analytics", analyticsRouter(db));
  app.use("/api/trends", trendsRouter);
  app.use("/api/platforms", platformsRouter);
  app.use("/api", postsRouter);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  return { app, db };
}

if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.API_PORT ?? "3001", 10);
  const { app } = createApp();
  const server = app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
  process.on("SIGTERM", () => {
    closeDb();
    server.close();
  });
}
