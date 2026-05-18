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
  `);
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
