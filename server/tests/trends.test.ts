import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { openDb, closeDb, getTrends, getLatestTrendsBySource, getMatchedTrends } from "../db.js";

let db: Database.Database;

function seed(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trends (
      source     TEXT NOT NULL,
      topic_id   TEXT NOT NULL,
      label      TEXT,
      score      REAL,
      fetched_at INTEGER NOT NULL,
      PRIMARY KEY (source, topic_id, fetched_at)
    );
    CREATE INDEX IF NOT EXISTS idx_trends_recent ON trends(source, fetched_at DESC);

    CREATE TABLE IF NOT EXISTS jobs (
      id          TEXT PRIMARY KEY,
      show_slug   TEXT,
      media_name  TEXT,
      drive_file_id TEXT,
      status      TEXT DEFAULT 'pending',
      created_at  INTEGER,
      updated_at  INTEGER,
      cost_cents  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS clips (
      id             TEXT PRIMARY KEY,
      job_id         TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      start_ms       INTEGER NOT NULL,
      end_ms         INTEGER NOT NULL,
      rank           INTEGER,
      score          REAL,
      hook           TEXT,
      reasoning_json TEXT,
      trend_match    TEXT
    );
  `);

  // Insert test trends
  const insertTrend = db.prepare(
    "INSERT INTO trends (source, topic_id, label, score, fetched_at) VALUES (?, ?, ?, ?, ?)"
  );
  const now = Math.floor(Date.now() / 1000);
  const batch1 = now - 3600; // 1 hour ago
  const batch2 = now;        // now (latest)

  // GDELT trends - batch 1 (older)
  insertTrend.run("gdelt", "gdelt-1", "AI Regulation", 0.94, batch1);
  insertTrend.run("gdelt", "gdelt-2", "SpaceX Launch", 0.88, batch1);

  // GDELT trends - batch 2 (latest)
  insertTrend.run("gdelt", "gdelt-1", "AI Regulation", 0.96, batch2);
  insertTrend.run("gdelt", "gdelt-3", "Quantum Computing", 0.82, batch2);

  // Reddit trends
  insertTrend.run("reddit", "reddit-1", "GPT-5 Released", 0.91, batch2);
  insertTrend.run("reddit", "reddit-2", "SpaceX Orbit", 0.85, batch2);

  // Google trends
  insertTrend.run("google", "google-1", "AI regulation 2026", 890000, batch2);
  insertTrend.run("google", "google-2", "Starship launch", 1200000, batch2);

  // Insert test jobs and clips (for match counting)
  db.prepare("INSERT INTO jobs (id, show_slug, media_name) VALUES (?, ?, ?)").run(
    "job-1", "test-show", "test.mp4"
  );

  const insertClip = db.prepare(
    "INSERT INTO clips (id, job_id, start_ms, end_ms, rank, score, hook, trend_match) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertClip.run("clip-1", "job-1", 0, 60000, 1, 94, "AI changes everything", "AI Regulation");
  insertClip.run("clip-2", "job-1", 60000, 120000, 2, 89, "SpaceX launch moment", "AI Regulation");
  insertClip.run("clip-3", "job-1", 120000, 180000, 3, 85, "Quantum breakthrough", "Quantum Computing");
  insertClip.run("clip-4", "job-1", 180000, 240000, 4, 80, "GPT-5 demo", "GPT-5 Released");
}

beforeAll(() => {
  // Use in-memory database for tests
  db = openDb(":memory:", { readonly: false });
  seed(db);
});

afterAll(() => {
  closeDb();
});

describe("getTrends", () => {
  it("returns all trends when no source filter", () => {
    const trends = getTrends();
    expect(trends.length).toBeGreaterThan(0);
    const sources = new Set(trends.map((t) => t.source));
    expect(sources.has("gdelt")).toBe(true);
    expect(sources.has("reddit")).toBe(true);
    expect(sources.has("google")).toBe(true);
  });

  it("filters by source when provided", () => {
    const trends = getTrends("gdelt");
    expect(trends.length).toBeGreaterThan(0);
    trends.forEach((t) => expect(t.source).toBe("gdelt"));
  });

  it("includes match_count from clips join", () => {
    const trends = getTrends("gdelt");
    const aiTrend = trends.find((t) => t.label === "AI Regulation");
    expect(aiTrend).toBeDefined();
    // AI Regulation has 2 clips matched to it
    expect(aiTrend!.match_count).toBeGreaterThan(0);
  });

  it("returns empty array for unknown source", () => {
    const trends = getTrends("nonexistent");
    expect(trends).toEqual([]);
  });
});

describe("getLatestTrendsBySource", () => {
  it("returns only the latest batch for gdelt", () => {
    const trends = getLatestTrendsBySource("gdelt");
    // Latest batch has "AI Regulation" (0.96) and "Quantum Computing" (0.82)
    // Should NOT include "SpaceX Launch" from older batch
    expect(trends.length).toBe(2);
    const labels = trends.map((t) => t.label);
    expect(labels).toContain("AI Regulation");
    expect(labels).toContain("Quantum Computing");
    expect(labels).not.toContain("SpaceX Launch");
  });

  it("sorts by score descending", () => {
    const trends = getLatestTrendsBySource("gdelt");
    for (let i = 1; i < trends.length; i++) {
      expect((trends[i - 1].score ?? 0)).toBeGreaterThanOrEqual(trends[i].score ?? 0);
    }
  });

  it("returns match counts correctly", () => {
    const trends = getLatestTrendsBySource("gdelt");
    const aiTrend = trends.find((t) => t.label === "AI Regulation");
    expect(aiTrend!.match_count).toBe(2);

    const quantumTrend = trends.find((t) => t.label === "Quantum Computing");
    expect(quantumTrend!.match_count).toBe(1);
  });
});

describe("getMatchedTrends", () => {
  it("returns only trends with matched clips", () => {
    const matched = getMatchedTrends();
    expect(matched.length).toBeGreaterThan(0);
    matched.forEach((m) => expect(m.match_count).toBeGreaterThan(0));
  });

  it("sorts by match_count descending", () => {
    const matched = getMatchedTrends();
    for (let i = 1; i < matched.length; i++) {
      expect(matched[i - 1].match_count).toBeGreaterThanOrEqual(matched[i].match_count);
    }
  });

  it("includes correct match counts", () => {
    const matched = getMatchedTrends();
    const aiMatch = matched.find((m) => m.topic === "AI Regulation");
    expect(aiMatch).toBeDefined();
    expect(aiMatch!.match_count).toBe(2);
  });
});
