import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { setDb, closeDb } from "./db";
import { clipsRouter } from "./clips";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.resolve(__dirname, "../test-clips.db");

function seedTestDb(): Database.Database {
  // Clean up any existing test db
  for (const p of [TEST_DB_PATH, TEST_DB_PATH + "-wal", TEST_DB_PATH + "-shm"]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  const db = new Database(TEST_DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      show_slug TEXT,
      media_name TEXT,
      drive_file_id TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER NOT NULL,
      rank INTEGER,
      score REAL,
      hook TEXT,
      reasoning_json TEXT,
      trend_match TEXT
    );

    CREATE TABLE IF NOT EXISTS clip_renders (
      clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
      variant TEXT NOT NULL,
      path TEXT NOT NULL,
      bytes INTEGER,
      duration_ms INTEGER,
      PRIMARY KEY (clip_id, variant)
    );

    CREATE TABLE IF NOT EXISTS posts (
      clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      status TEXT NOT NULL,
      external_id TEXT,
      external_url TEXT,
      posted_at INTEGER,
      error TEXT,
      PRIMARY KEY (clip_id, platform)
    );

    CREATE TABLE IF NOT EXISTS analytics (
      clip_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      views INTEGER,
      ctr REAL,
      watch_pct REAL,
      PRIMARY KEY (clip_id, platform, fetched_at)
    );
  `);

  // Seed data
  db.prepare(`INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "job-1", "jre", "JRE_2247.mp4", "abc123", "done", 1715000000, 1715000100, 284, null
  );

  db.prepare(`INSERT INTO clips VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "clip-1", "job-1", 10000, 68000, 1, 94.0, "This changes everything", '{"vlm_score": 88}', "AI Regulation"
  );
  db.prepare(`INSERT INTO clips VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "clip-2", "job-1", 120000, 192000, 2, 89.0, "I've never told anyone this", null, null
  );
  db.prepare(`INSERT INTO clips VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "clip-3", "job-1", 300000, 347000, 3, 85.0, "The real reason I left", null, null
  );

  db.prepare(`INSERT INTO clip_renders VALUES (?, ?, ?, ?, ?)`).run(
    "clip-1", "thumbnail", "/work/clip-1/thumb.jpg", 45000, null
  );
  db.prepare(`INSERT INTO clip_renders VALUES (?, ?, ?, ?, ?)`).run(
    "clip-1", "9:16", "/work/clip-1/vertical.mp4", 8500000, 58000
  );

  db.prepare(`INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    "clip-1", "youtube", "posted", "yt-123", "https://youtube.com/shorts/123", 1715001000, null
  );
  db.prepare(`INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    "clip-1", "bluesky", "posted", "bsky-456", "https://bsky.app/456", 1715001100, null
  );
  db.prepare(`INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    "clip-2", "youtube", "pending", null, null, null, null
  );

  db.prepare(`INSERT INTO analytics VALUES (?, ?, ?, ?, ?, ?)`).run(
    "clip-1", "youtube", 1715100000, 248000, 16.2, 78.0
  );
  db.prepare(`INSERT INTO analytics VALUES (?, ?, ?, ?, ?, ?)`).run(
    "clip-1", "bluesky", 1715100000, 12000, 6.8, 62.0
  );

  return db;
}

let app: express.Application;
let testDb: Database.Database;

beforeAll(() => {
  testDb = seedTestDb();
  // Set env for the PATCH handler's write db
  process.env.AUTOSEO_DB_PATH = TEST_DB_PATH;
  // Inject the test db into the readonly singleton
  setDb(testDb);

  app = express();
  app.use(express.json());
  app.use("/api/clips", clipsRouter);
});

afterAll(() => {
  closeDb();
  for (const p of [TEST_DB_PATH, TEST_DB_PATH + "-wal", TEST_DB_PATH + "-shm"]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe("GET /api/clips", () => {
  it("returns paginated clips", async () => {
    const res = await request(app).get("/api/clips");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.page).toBe(1);
  });

  it("filters by job_id", async () => {
    const res = await request(app).get("/api/clips?job_id=job-1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });

  it("filters by min_score", async () => {
    const res = await request(app).get("/api/clips?min_score=90");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hook).toBe("This changes everything");
  });

  it("filters by status", async () => {
    const res = await request(app).get("/api/clips?status=posted");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("clip-1");
  });

  it("respects pagination params", async () => {
    const res = await request(app).get("/api/clips?page=2&limit=1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it("includes platform statuses", async () => {
    const res = await request(app).get("/api/clips");
    const clip1 = res.body.data.find((c: { id: string }) => c.id === "clip-1");
    expect(clip1.platforms.youtube).toBe("posted");
    expect(clip1.platforms.bluesky).toBe("posted");
  });

  it("includes analytics data", async () => {
    const res = await request(app).get("/api/clips");
    const clip1 = res.body.data.find((c: { id: string }) => c.id === "clip-1");
    expect(clip1.views).toBe(260000);
    expect(clip1.ctr).toBeCloseTo(11.5, 0);
  });
});

describe("GET /api/clips/:id", () => {
  it("returns full clip detail", async () => {
    const res = await request(app).get("/api/clips/clip-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("clip-1");
    expect(res.body.hook).toBe("This changes everything");
    expect(res.body.llmScore).toBe(94);
    expect(res.body.vlmScore).toBe(88);
    expect(res.body.status).toBe("posted");
    expect(res.body.renders).toHaveLength(2);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.platforms.youtube).toBe("posted");
    expect(res.body.thumbnail).toBe("/work/clip-1/thumb.jpg");
  });

  it("returns 404 for missing clip", async () => {
    const res = await request(app).get("/api/clips/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Clip not found");
  });
});

describe("GET /api/clips/stats", () => {
  it("returns aggregate stats", async () => {
    const res = await request(app).get("/api/clips/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalClips).toBe(3);
    expect(res.body.postedClips).toBe(1);
    expect(res.body.avgScore).toBeCloseTo(89.3, 0);
    expect(res.body.totalViews).toBe(260000);
  });
});

describe("GET /api/clips/leaderboard", () => {
  it("returns top clips by views", async () => {
    const res = await request(app).get("/api/clips/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("clip-1");
    expect(res.body[0].views).toBe(260000);
  });

  it("respects limit param", async () => {
    const res = await request(app).get("/api/clips/leaderboard?limit=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("sorts by ctr when requested", async () => {
    const res = await request(app).get("/api/clips/leaderboard?sort_by=ctr");
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("clip-1");
  });
});

describe("PATCH /api/clips/:id", () => {
  it("updates hook text", async () => {
    const res = await request(app)
      .patch("/api/clips/clip-3")
      .send({ hook: "Updated hook text" });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);

    // Verify
    const detail = await request(app).get("/api/clips/clip-3");
    expect(detail.body.hook).toBe("Updated hook text");
  });

  it("approves a clip (creates pending posts)", async () => {
    const res = await request(app)
      .patch("/api/clips/clip-3")
      .send({ status: "approved" });
    expect(res.status).toBe(200);

    const detail = await request(app).get("/api/clips/clip-3");
    expect(detail.body.platforms.youtube).toBe("pending");
    expect(detail.body.platforms.bluesky).toBe("pending");
  });

  it("returns 404 for missing clip", async () => {
    const res = await request(app)
      .patch("/api/clips/nonexistent")
      .send({ hook: "test" });
    expect(res.status).toBe(404);
  });
});
