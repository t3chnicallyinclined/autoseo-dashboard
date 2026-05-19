import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "./index.js";
import { getDb, closeDb } from "./db.js";
import type { Express } from "express";

let app: Express;

function seedDb() {
  const db = getDb();
  db.exec("DELETE FROM posts");
  db.exec("DELETE FROM clips");
  db.exec("DELETE FROM jobs");

  const now = Math.floor(Date.now() / 1000);
  const hour = 3600;

  // Insert 3 jobs
  db.prepare(
    `INSERT INTO jobs (id, show_slug, media_name, drive_file_id, status, created_at, updated_at, cost_cents, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("job-1", "jre", "JRE_2247.mp4", "drive-1", "done", now - 5 * hour, now - 4 * hour, 284, null);

  db.prepare(
    `INSERT INTO jobs (id, show_slug, media_name, drive_file_id, status, created_at, updated_at, cost_cents, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("job-2", "lex", "Lex_450.mp4", "drive-2", "ranked", now - 3 * hour, now - 2 * hour, 195, null);

  db.prepare(
    `INSERT INTO jobs (id, show_slug, media_name, drive_file_id, status, created_at, updated_at, cost_cents, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("job-3", "jre", "JRE_2248.mp4", null, "failed", now - 1 * hour, now, 34, "Whisper timeout");

  // Insert clips for job-1
  db.prepare(
    `INSERT INTO clips (id, job_id, start_ms, end_ms, rank, score, hook)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run("clip-1", "job-1", 0, 58000, 1, 94, "AI regulation hook");

  db.prepare(
    `INSERT INTO clips (id, job_id, start_ms, end_ms, rank, score, hook)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run("clip-2", "job-1", 60000, 132000, 2, 89, "Secret reveal");

  // Insert posts for clip-1
  db.prepare(
    `INSERT INTO posts (clip_id, platform, status, posted_at)
     VALUES (?, ?, ?, ?)`
  ).run("clip-1", "youtube", "posted", now);

  db.prepare(
    `INSERT INTO posts (clip_id, platform, status, posted_at)
     VALUES (?, ?, ?, ?)`
  ).run("clip-1", "bluesky", "posted", now);

  db.prepare(
    `INSERT INTO posts (clip_id, platform, status, error)
     VALUES (?, ?, ?, ?)`
  ).run("clip-2", "youtube", "failed", "Upload error");
}

beforeEach(() => {
  process.env.CLIPPER_DB = ":memory:";
  // Force new DB for each test
  closeDb();
  app = createApp().app;
  seedDb();
});

afterAll(() => {
  closeDb();
});

describe("GET /api/jobs", () => {
  it("returns paginated jobs list", async () => {
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(50);
    expect(res.body.offset).toBe(0);
  });

  it("respects limit and offset", async () => {
    const res = await request(app).get("/api/jobs?limit=1&offset=1");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(3);
    expect(res.body.offset).toBe(1);
  });

  it("filters by status", async () => {
    const res = await request(app).get("/api/jobs?status=done");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("done");
  });

  it("filters by show_slug", async () => {
    const res = await request(app).get("/api/jobs?show_slug=jre");
    expect(res.body.data).toHaveLength(2);
  });

  it("returns correct response shape matching sample.ts", async () => {
    const res = await request(app).get("/api/jobs?status=done");
    const job = res.body.data[0];
    expect(job).toHaveProperty("id");
    expect(job).toHaveProperty("episodeId");
    expect(job).toHaveProperty("showId");
    expect(job).toHaveProperty("media");
    expect(job).toHaveProperty("status");
    expect(job).toHaveProperty("stage");
    expect(job).toHaveProperty("progress");
    expect(job).toHaveProperty("clipsGenerated");
    expect(job).toHaveProperty("postsSuccess");
    expect(job).toHaveProperty("postsTotal");
    expect(job).toHaveProperty("cost");
    expect(job).toHaveProperty("duration");
    expect(job).toHaveProperty("created");
  });

  it("includes clip and post counts", async () => {
    const res = await request(app).get("/api/jobs?status=done");
    const job = res.body.data[0];
    expect(job.clipsGenerated).toBe(2);
    expect(job.postsSuccess).toBe(2);
    expect(job.postsTotal).toBe(3);
  });

  it("maps cost from cents to dollars", async () => {
    const res = await request(app).get("/api/jobs?status=done");
    expect(res.body.data[0].cost).toBe(2.84);
  });

  it("includes error field only for failed jobs", async () => {
    const res = await request(app).get("/api/jobs?status=failed");
    expect(res.body.data[0].error).toBe("Whisper timeout");
  });

  it("maps status to stage correctly", async () => {
    const res = await request(app).get("/api/jobs?status=done");
    expect(res.body.data[0].stage).toBe("complete");
    expect(res.body.data[0].progress).toBe(100);
  });
});

describe("GET /api/jobs/:id", () => {
  it("returns job detail with clips", async () => {
    const res = await request(app).get("/api/jobs/job-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("job-1");
    expect(res.body.clips).toHaveLength(2);
    expect(res.body.clips[0].hook).toBe("AI regulation hook");
  });

  it("returns 404 for unknown job", async () => {
    const res = await request(app).get("/api/jobs/nonexistent");
    expect(res.status).toBe(404);
  });

  it("clips include post counts", async () => {
    const res = await request(app).get("/api/jobs/job-1");
    const clip1 = res.body.clips.find((c: { id: string }) => c.id === "clip-1");
    expect(clip1.postsSuccess).toBe(2);
    expect(clip1.postsTotal).toBe(2);
  });
});

describe("POST /api/jobs", () => {
  it("creates a new job", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .send({ media_name: "New_Episode.mp4", show_slug: "jre" });
    expect(res.status).toBe(201);
    expect(res.body.media).toBe("New_Episode.mp4");
    expect(res.body.showId).toBe("jre");
    expect(res.body.status).toBe("pending");
    expect(res.body.stage).toBe("ingest");
    expect(res.body.progress).toBe(0);
  });

  it("returns 400 without media_name", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .send({ show_slug: "jre" });
    expect(res.status).toBe(400);
  });

  it("persists the new job", async () => {
    const createRes = await request(app)
      .post("/api/jobs")
      .send({ media_name: "Test.mp4" });
    const id = createRes.body.id;

    const getRes = await request(app).get(`/api/jobs/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.media).toBe("Test.mp4");
  });
});

describe("PATCH /api/jobs/:id/retry", () => {
  it("retries a failed job", async () => {
    const res = await request(app).patch("/api/jobs/job-3/retry");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(res.body).not.toHaveProperty("error");
  });

  it("returns 404 for unknown job", async () => {
    const res = await request(app).patch("/api/jobs/nonexistent/retry");
    expect(res.status).toBe(404);
  });

  it("returns 409 for non-failed job", async () => {
    const res = await request(app).patch("/api/jobs/job-1/retry");
    expect(res.status).toBe(409);
  });
});

describe("GET /api/jobs/stats", () => {
  it("returns aggregate stats", async () => {
    const res = await request(app).get("/api/jobs/stats");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.byStatus.done).toBe(1);
    expect(res.body.byStatus.ranked).toBe(1);
    expect(res.body.byStatus.failed).toBe(1);
    expect(res.body.totalCost).toBeCloseTo(5.13, 2);
  });
});
