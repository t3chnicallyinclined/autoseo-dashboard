import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Database from "better-sqlite3";
import express from "express";
import type { Server } from "http";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtempSync } from "fs";

// We need to set CLIPPER_DB before importing modules that use it
const tmpDir = mkdtempSync(join(tmpdir(), "api-test-"));
const testDbPath = join(tmpDir, "test.db");
process.env.CLIPPER_DB = testDbPath;

// Set platform env vars for config tests
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_REFRESH_TOKEN = "test-refresh";
process.env.YOUTUBE_CHANNEL_HANDLE = "@TestChannel";
process.env.BLUESKY_HANDLE = "test.bsky.social";
process.env.BLUESKY_APP_PASSWORD = "test-password";

// Dynamic imports after env setup
let platformsRouter: typeof import("../routes/platforms.js").default;
let postsRouter: typeof import("../routes/posts.js").default;
let getDb: typeof import("../db.js").getDb;
let closeDb: typeof import("../db.js").closeDb;

let app: express.Express;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const dbMod = await import("../db.js");
  getDb = dbMod.getDb;
  closeDb = dbMod.closeDb;

  const platMod = await import("../routes/platforms.js");
  const postMod = await import("../routes/posts.js");
  platformsRouter = platMod.default;
  postsRouter = postMod.default;

  app = express();
  app.use(express.json());
  app.use("/api/platforms", platformsRouter);
  app.use("/api", postsRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  closeDb();
  server?.close();
});

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM analytics");
  db.exec("DELETE FROM posts");
  db.exec("DELETE FROM clip_renders");
  db.exec("DELETE FROM clips");
  db.exec("DELETE FROM jobs");
});

function seedTestData() {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(
    "INSERT INTO jobs (id, show_slug, media_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("job-1", "test-show", "test.mp4", "done", now - 3600, now);

  db.prepare(
    "INSERT INTO clips (id, job_id, start_ms, end_ms, rank, score, hook) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("clip-1", "job-1", 0, 60000, 1, 94.5, "Test hook");

  db.prepare(
    "INSERT INTO clip_renders (clip_id, variant, path, bytes, duration_ms) VALUES (?, ?, ?, ?, ?)"
  ).run("clip-1", "9x16", "/tmp/clip-1-9x16.mp4", 5000000, 60000);

  db.prepare(
    "INSERT INTO posts (clip_id, platform, status, external_url, posted_at) VALUES (?, ?, ?, ?, ?)"
  ).run("clip-1", "youtube", "posted", "https://youtube.com/shorts/abc", now - 1800);

  db.prepare(
    "INSERT INTO posts (clip_id, platform, status, posted_at) VALUES (?, ?, ?, ?)"
  ).run("clip-1", "bluesky", "posted", now - 1800);

  db.prepare(
    "INSERT INTO posts (clip_id, platform, status, error) VALUES (?, ?, ?, ?)"
  ).run("clip-1", "linkedin", "failed", "Token expired");

  db.prepare(
    "INSERT INTO analytics (clip_id, platform, fetched_at, views, ctr, watch_pct) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("clip-1", "youtube", now - 600, 12000, 14.2, 78.5);

  db.prepare(
    "INSERT INTO analytics (clip_id, platform, fetched_at, views, ctr, watch_pct) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("clip-1", "bluesky", now - 600, 3200, 6.8, 62.0);
}

async function get(path: string) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path: string, data?: object) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  return { status: res.status, body: await res.json() };
}

async function patch(path: string) {
  const res = await fetch(`${baseUrl}${path}`, { method: "PATCH" });
  return { status: res.status, body: await res.json() };
}

describe("GET /api/platforms", () => {
  it("returns all 6 platforms with connection status from env", async () => {
    const { status, body } = await get("/api/platforms");
    expect(status).toBe(200);
    expect(body).toHaveLength(6);

    const yt = body.find((p: any) => p.id === "youtube");
    expect(yt.status).toBe("connected");
    expect(yt.handle).toBe("@TestChannel");
    expect(yt.name).toBe("YouTube Shorts");

    const bs = body.find((p: any) => p.id === "bluesky");
    expect(bs.status).toBe("connected");
    expect(bs.handle).toBe("@test.bsky.social");

    // Unconfigured platforms
    const tt = body.find((p: any) => p.id === "tiktok");
    expect(tt.status).toBe("not_configured");

    const ig = body.find((p: any) => p.id === "instagram");
    expect(ig.status).toBe("not_configured");
  });

  it("includes aggregated stats from posts and analytics", async () => {
    seedTestData();
    const { body } = await get("/api/platforms");

    const yt = body.find((p: any) => p.id === "youtube");
    expect(yt.totalPosts).toBe(1);
    expect(yt.totalViews).toBe(12000);
    expect(yt.avgCtr).toBe(14.2);
    expect(yt.avgWatch).toBe(79); // rounded

    const bs = body.find((p: any) => p.id === "bluesky");
    expect(bs.totalPosts).toBe(1);
    expect(bs.totalViews).toBe(3200);
  });

  it("shows 'Never' for platforms with no posts", async () => {
    const { body } = await get("/api/platforms");
    const tt = body.find((p: any) => p.id === "tiktok");
    expect(tt.lastPost).toBe("Never");
    expect(tt.totalPosts).toBe(0);
  });
});

describe("GET /api/clips/:id/posts", () => {
  it("returns posts with analytics for a clip", async () => {
    seedTestData();
    const { status, body } = await get("/api/clips/clip-1/posts");
    expect(status).toBe(200);
    expect(body).toHaveLength(3);

    const ytPost = body.find((p: any) => p.platform === "youtube");
    expect(ytPost.status).toBe("posted");
    expect(ytPost.external_url).toBe("https://youtube.com/shorts/abc");
    expect(ytPost.views).toBe(12000);
  });

  it("returns 404 for nonexistent clip", async () => {
    const { status, body } = await get("/api/clips/nonexistent/posts");
    expect(status).toBe(404);
    expect(body.error).toBe("Clip not found");
  });
});

describe("POST /api/clips/:id/post", () => {
  it("returns 404 for nonexistent clip", async () => {
    const { status, body } = await post("/api/clips/nonexistent/post");
    expect(status).toBe(404);
    expect(body.error).toBe("Clip not found");
  });

  it("returns 400 if no rendered video exists", async () => {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare("INSERT INTO jobs (id, status, created_at, updated_at) VALUES (?, ?, ?, ?)").run("job-2", "done", now, now);
    db.prepare("INSERT INTO clips (id, job_id, start_ms, end_ms) VALUES (?, ?, ?, ?)").run("clip-norender", "job-2", 0, 30000);

    const { status, body } = await post("/api/clips/clip-norender/post");
    expect(status).toBe(400);
    expect(body.error).toContain("No rendered video");
  });
});

describe("PATCH /api/clips/:id/posts/:platform/veto", () => {
  it("vetoes an existing post", async () => {
    seedTestData();
    const { status, body } = await patch("/api/clips/clip-1/posts/youtube/veto");
    expect(status).toBe(200);
    expect(body.post_status).toBe("vetoed");

    // Verify in DB
    const db = getDb();
    const row = db.prepare("SELECT status FROM posts WHERE clip_id = ? AND platform = ?").get("clip-1", "youtube") as any;
    expect(row.status).toBe("vetoed");
  });

  it("creates a vetoed record for a platform with no prior post", async () => {
    seedTestData();
    const { status, body } = await patch("/api/clips/clip-1/posts/tiktok/veto");
    expect(status).toBe(200);
    expect(body.post_status).toBe("vetoed");

    const db = getDb();
    const row = db.prepare("SELECT status FROM posts WHERE clip_id = ? AND platform = ?").get("clip-1", "tiktok") as any;
    expect(row.status).toBe("vetoed");
  });
});

describe("GET /api/posts/stats", () => {
  it("returns empty array when no posts exist", async () => {
    const { status, body } = await get("/api/posts/stats");
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns aggregated stats by platform", async () => {
    seedTestData();
    const { status, body } = await get("/api/posts/stats");
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(2);

    const yt = body.find((s: any) => s.platform === "youtube");
    expect(yt.posted).toBe(1);
    expect(yt.totalViews).toBe(12000);

    const li = body.find((s: any) => s.platform === "linkedin");
    expect(li.failed).toBe(1);
    expect(li.posted).toBe(0);
  });
});
