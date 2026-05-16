import express from "express";
import cors from "cors";
import { jobsRouter } from "./jobs.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/jobs", jobsRouter);
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.API_PORT ?? "3001", 10);
  const app = createApp();
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
