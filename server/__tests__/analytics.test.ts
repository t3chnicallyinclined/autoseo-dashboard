import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../index.js";
import type { Express } from "express";
import type Database from "better-sqlite3";

let app: Express;
let db: Database.Database;

beforeAll(() => {
  const result = createApp(":memory:");
  app = result.app;
  db = result.db;
});

afterAll(() => {
  db.close();
});

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/analytics/overview", () => {
  it("returns KPI summary with default range", async () => {
    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_views");
    expect(res.body).toHaveProperty("avg_ctr");
    expect(res.body).toHaveProperty("avg_watch_pct");
    expect(res.body).toHaveProperty("clip_count");
    expect(typeof res.body.total_views).toBe("number");
    expect(typeof res.body.avg_ctr).toBe("number");
  });

  it("accepts range parameter", async () => {
    const res = await request(app).get("/api/analytics/overview?range=30d");
    expect(res.status).toBe(200);
    expect(res.body.total_views).toBeGreaterThan(0);
  });

  it("accepts custom date range", async () => {
    const from = new Date(Date.now() - 30 * 86400000).toISOString();
    const to = new Date().toISOString();
    const res = await request(app).get(`/api/analytics/overview?from=${from}&to=${to}`);
    expect(res.status).toBe(200);
    expect(res.body.total_views).toBeGreaterThan(0);
  });
});

describe("GET /api/analytics/views", () => {
  it("returns time-series data with platform breakdown", async () => {
    const res = await request(app).get("/api/analytics/views?range=30d");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const row = res.body[0];
    expect(row).toHaveProperty("date");
    expect(row).toHaveProperty("youtube");
    expect(row).toHaveProperty("bluesky");
    expect(row).toHaveProperty("linkedin");
    expect(row).toHaveProperty("threads");
  });
});

describe("GET /api/analytics/ctr", () => {
  it("returns CTR by platform", async () => {
    const res = await request(app).get("/api/analytics/ctr?range=30d");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const row = res.body[0];
    expect(row).toHaveProperty("platform");
    expect(row).toHaveProperty("ctr");
    expect(typeof row.ctr).toBe("number");
  });
});

describe("GET /api/analytics/watch-distribution", () => {
  it("returns histogram buckets", async () => {
    const res = await request(app).get("/api/analytics/watch-distribution?range=30d");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const bucket of res.body) {
      expect(bucket).toHaveProperty("bucket");
      expect(bucket).toHaveProperty("count");
      expect(typeof bucket.count).toBe("number");
    }
  });
});

describe("GET /api/analytics/score-vs-performance", () => {
  it("returns scatter data with score and ctr", async () => {
    const res = await request(app).get("/api/analytics/score-vs-performance?range=30d");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const point = res.body[0];
    expect(point).toHaveProperty("clip_id");
    expect(point).toHaveProperty("hook");
    expect(point).toHaveProperty("score");
    expect(point).toHaveProperty("ctr");
    expect(point).toHaveProperty("views");
  });
});

describe("GET /api/analytics/top-clips", () => {
  it("returns leaderboard with ranked clips", async () => {
    const res = await request(app).get("/api/analytics/top-clips?range=30d");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const clip = res.body[0];
    expect(clip).toHaveProperty("rank");
    expect(clip).toHaveProperty("hook");
    expect(clip).toHaveProperty("episode");
    expect(clip).toHaveProperty("platform");
    expect(clip).toHaveProperty("views");
    expect(clip).toHaveProperty("ctr");
    expect(clip).toHaveProperty("watchPct");
    expect(clip).toHaveProperty("score");
    expect(clip.rank).toBe(1);
  });

  it("respects limit parameter", async () => {
    const res = await request(app).get("/api/analytics/top-clips?range=30d&limit=3");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(3);
  });

  it("clips are sorted by views descending", async () => {
    const res = await request(app).get("/api/analytics/top-clips?range=30d");
    expect(res.status).toBe(200);
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i - 1].views).toBeGreaterThanOrEqual(res.body[i].views);
    }
  });
});

describe("GET /api/analytics/by-show", () => {
  it("returns show comparison data", async () => {
    const res = await request(app).get("/api/analytics/by-show?range=30d");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const show = res.body[0];
    expect(show).toHaveProperty("show");
    expect(show).toHaveProperty("total_views");
    expect(show).toHaveProperty("avg_ctr");
    expect(show).toHaveProperty("avg_watch_pct");
    expect(show).toHaveProperty("clip_count");
  });
});

describe("date range filtering", () => {
  it("7d range returns less or equal data than 30d", async () => {
    const [res7, res30] = await Promise.all([
      request(app).get("/api/analytics/overview?range=7d"),
      request(app).get("/api/analytics/overview?range=30d"),
    ]);
    expect(res7.body.total_views).toBeLessThanOrEqual(res30.body.total_views);
  });
});
