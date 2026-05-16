import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.CLIPPER_DB ?? path.resolve("clipper.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: false });
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    ensureSchema(_db);
  }
  return _db;
}

export function setDb(newDb: Database.Database): void {
  _db = newDb;
}

export function createDb(dbPath?: string): Database.Database {
  const db = new Database(dbPath ?? ":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id              TEXT PRIMARY KEY,
      show_slug       TEXT,
      media_name      TEXT,
      drive_file_id   TEXT,
      status          TEXT NOT NULL,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      cost_cents      INTEGER NOT NULL DEFAULT 0,
      error           TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_show_slug ON jobs(show_slug);

    CREATE TABLE IF NOT EXISTS clips (
      id              TEXT PRIMARY KEY,
      job_id          TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      start_ms        INTEGER NOT NULL,
      end_ms          INTEGER NOT NULL,
      rank            INTEGER,
      score           REAL,
      hook            TEXT,
      reasoning_json  TEXT,
      trend_match     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_clips_job_id ON clips(job_id);

    CREATE TABLE IF NOT EXISTS posts (
      clip_id         TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
      platform        TEXT NOT NULL,
      status          TEXT NOT NULL,
      external_id     TEXT,
      external_url    TEXT,
      posted_at       INTEGER,
      error           TEXT,
      PRIMARY KEY (clip_id, platform)
    );
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

    CREATE TABLE IF NOT EXISTS analytics (
      clip_id         TEXT NOT NULL,
      platform        TEXT NOT NULL,
      fetched_at      INTEGER NOT NULL,
      views           INTEGER,
      ctr             REAL,
      watch_pct       REAL,
      PRIMARY KEY (clip_id, platform, fetched_at)
    );
  `);
}

export function seedDb(db: Database.Database): void {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  const insertJob = db.prepare(
    `INSERT OR IGNORE INTO jobs (id, show_slug, media_name, status, created_at, updated_at, cost_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const jobRows = [
    ["job-001", "jre", "JRE_2247_Elon_Musk_4K.mp4", "done", now - 6 * day, now - 6 * day, 284],
    ["job-002", "jre", "JRE_2246_Sam_Altman.mp4", "done", now - 11 * day, now - 11 * day, 221],
    ["job-003", "lex", "Lex_450_Karpathy.mp4", "done", now - 8 * day, now - 8 * day, 195],
    ["job-004", "allin", "AllIn_E185_Q2_Recap.mp4", "done", now - 4 * day, now - 4 * day, 168],
  ];
  for (const r of jobRows) insertJob.run(...r);

  const insertClip = db.prepare(
    `INSERT OR IGNORE INTO clips (id, job_id, start_ms, end_ms, rank, score, hook)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const clipRows = [
    ["c1", "job-001", 120000, 178000, 1, 94, "This changes everything about AI regulation"],
    ["c2", "job-001", 340000, 412000, 2, 89, "I've never told anyone this before"],
    ["c3", "job-001", 580000, 627000, 3, 85, "The real reason I left the company"],
    ["c4", "job-001", 810000, 903000, 4, 82, "People don't understand what's coming next"],
    ["c5", "job-002", 95000, 147000, 1, 91, "GPT-5 is already deployed internally"],
    ["c6", "job-003", 200000, 260000, 1, 88, "Backpropagation explained in 60 seconds"],
    ["c7", "job-004", 150000, 228000, 1, 87, "The Fed is about to make a historic mistake"],
    ["c8", "job-001", 1100000, 1144000, 5, 78, "Why every startup is doing this wrong"],
  ];
  for (const r of clipRows) insertClip.run(...r);

  const insertPost = db.prepare(
    `INSERT OR IGNORE INTO posts (clip_id, platform, status, posted_at)
     VALUES (?, ?, ?, ?)`
  );
  const postRows = [
    ["c1", "youtube", "posted", now - 6 * day],
    ["c1", "bluesky", "posted", now - 6 * day],
    ["c1", "linkedin", "failed", now - 6 * day],
    ["c1", "threads", "posted", now - 6 * day],
    ["c2", "youtube", "posted", now - 6 * day],
    ["c2", "bluesky", "posted", now - 6 * day],
    ["c2", "threads", "posted", now - 6 * day],
    ["c3", "youtube", "posted", now - 5 * day],
    ["c5", "youtube", "posted", now - 10 * day],
    ["c5", "bluesky", "posted", now - 10 * day],
    ["c5", "linkedin", "posted", now - 10 * day],
    ["c5", "threads", "posted", now - 10 * day],
    ["c6", "youtube", "posted", now - 7 * day],
    ["c6", "bluesky", "posted", now - 7 * day],
    ["c6", "linkedin", "posted", now - 7 * day],
  ];
  for (const r of postRows) insertPost.run(...r);

  const insertAnalytics = db.prepare(
    `INSERT OR IGNORE INTO analytics (clip_id, platform, fetched_at, views, ctr, watch_pct)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const clipPlatformData: Record<string, Record<string, { baseViews: number; ctr: number; watchPct: number }>> = {
    c1: { youtube: { baseViews: 248000, ctr: 16.2, watchPct: 78 }, bluesky: { baseViews: 28000, ctr: 8.1, watchPct: 65 }, threads: { baseViews: 14500, ctr: 5.2, watchPct: 58 } },
    c2: { youtube: { baseViews: 182000, ctr: 14.8, watchPct: 85 }, bluesky: { baseViews: 22000, ctr: 7.4, watchPct: 70 }, threads: { baseViews: 11200, ctr: 4.8, watchPct: 62 } },
    c3: { youtube: { baseViews: 94000, ctr: 11.3, watchPct: 72 } },
    c5: { youtube: { baseViews: 156000, ctr: 13.5, watchPct: 82 }, bluesky: { baseViews: 18000, ctr: 6.9, watchPct: 68 }, linkedin: { baseViews: 6800, ctr: 3.2, watchPct: 45 }, threads: { baseViews: 9800, ctr: 4.1, watchPct: 55 } },
    c6: { youtube: { baseViews: 72000, ctr: 8.9, watchPct: 91 }, bluesky: { baseViews: 12000, ctr: 5.5, watchPct: 75 }, linkedin: { baseViews: 5100, ctr: 3.8, watchPct: 50 } },
  };
  const growth = [0.05, 0.15, 0.35, 0.55, 0.72, 0.88, 1.0];
  for (const [clipId, platforms] of Object.entries(clipPlatformData)) {
    for (const [platform, data] of Object.entries(platforms)) {
      for (let d = 0; d < 7; d++) {
        const fetchedAt = now - (6 - d) * day;
        const views = Math.round(data.baseViews * growth[d]);
        const ctr = +(data.ctr * (0.7 + 0.3 * growth[d])).toFixed(1);
        const watchPct = +(data.watchPct + (Math.random() * 4 - 2)).toFixed(1);
        insertAnalytics.run(clipId, platform, fetchedAt, views, ctr, watchPct);
      }
    }
  }
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
