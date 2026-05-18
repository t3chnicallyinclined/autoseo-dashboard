import { Router, Request, Response } from "express";
import { getDb } from "./db.js";

export const jobsRouter = Router();

// Map DB status to frontend stage name
function statusToStage(status: string): string {
  const map: Record<string, string> = {
    pending: "ingest",
    transcribed: "transcribe",
    ranked: "rank",
    rendered: "render",
    posted: "post",
    done: "complete",
    failed: "failed",
  };
  return map[status] ?? status;
}

// Map DB status to approximate progress percentage
function statusToProgress(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    transcribed: 40,
    ranked: 60,
    rendered: 80,
    posted: 90,
    done: 100,
    failed: 0,
  };
  return map[status] ?? 0;
}

// Format duration between two unix timestamps (seconds)
function formatDuration(createdAt: number, updatedAt: number): string {
  const diffSec = Math.max(0, updatedAt - createdAt);
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

interface JobRow {
  id: string;
  show_slug: string | null;
  media_name: string | null;
  drive_file_id: string | null;
  status: string;
  created_at: number;
  updated_at: number;
  cost_cents: number;
  error: string | null;
}

interface ClipCountRow {
  job_id: string;
  clips_generated: number;
  posts_success: number;
  posts_total: number;
}

function mapJob(row: JobRow, counts?: ClipCountRow) {
  return {
    id: row.id,
    episodeId: null,
    showId: row.show_slug,
    media: row.media_name ?? "",
    status: row.status,
    stage: statusToStage(row.status),
    progress: statusToProgress(row.status),
    clipsGenerated: counts?.clips_generated ?? 0,
    postsSuccess: counts?.posts_success ?? 0,
    postsTotal: counts?.posts_total ?? 0,
    cost: row.cost_cents / 100,
    duration: formatDuration(row.created_at, row.updated_at),
    created: new Date(row.created_at * 1000).toISOString(),
    ...(row.error ? { error: row.error } : {}),
  };
}

// GET /api/jobs — list jobs (paginated, filterable)
jobsRouter.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.query.status) {
    conditions.push("j.status = ?");
    params.push(req.query.status);
  }
  if (req.query.show_slug) {
    conditions.push("j.show_slug = ?");
    params.push(req.query.show_slug);
  }
  if (req.query.date_from) {
    conditions.push("j.created_at >= ?");
    params.push(Math.floor(new Date(req.query.date_from as string).getTime() / 1000));
  }
  if (req.query.date_to) {
    conditions.push("j.created_at <= ?");
    params.push(Math.floor(new Date(req.query.date_to as string).getTime() / 1000));
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM jobs j ${where}`).get(...params) as { total: number };
  const total = totalRow.total;

  const rows = db.prepare(
    `SELECT j.* FROM jobs j ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as JobRow[];

  // Batch fetch clip/post counts for these jobs
  const jobIds = rows.map((r) => r.id);
  const countsMap = new Map<string, ClipCountRow>();

  if (jobIds.length > 0) {
    const placeholders = jobIds.map(() => "?").join(",");
    const countRows = db.prepare(`
      SELECT
        c.job_id,
        COUNT(DISTINCT c.id) as clips_generated,
        COUNT(CASE WHEN p.status = 'posted' THEN 1 END) as posts_success,
        COUNT(p.clip_id) as posts_total
      FROM clips c
      LEFT JOIN posts p ON p.clip_id = c.id
      WHERE c.job_id IN (${placeholders})
      GROUP BY c.job_id
    `).all(...jobIds) as ClipCountRow[];

    for (const cr of countRows) {
      countsMap.set(cr.job_id, cr);
    }
  }

  res.json({
    data: rows.map((r) => mapJob(r, countsMap.get(r.id))),
    total,
    limit,
    offset,
  });
});

// GET /api/jobs/stats — aggregate stats
jobsRouter.get("/stats", (_req: Request, res: Response) => {
  const db = getDb();

  const statusCounts = db.prepare(
    `SELECT status, COUNT(*) as count FROM jobs GROUP BY status`
  ).all() as { status: string; count: number }[];

  const costRow = db.prepare(
    `SELECT COALESCE(SUM(cost_cents), 0) as total_cost_cents FROM jobs`
  ).get() as { total_cost_cents: number };

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM jobs`).get() as { total: number };

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row.status] = row.count;
  }

  res.json({
    total: totalRow.total,
    byStatus,
    totalCost: costRow.total_cost_cents / 100,
  });
});

// GET /api/jobs/:id — get job detail with clips summary
jobsRouter.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id) as JobRow | undefined;

  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const clips = db.prepare(
    `SELECT c.id, c.start_ms, c.end_ms, c.rank, c.score, c.hook,
            COUNT(CASE WHEN p.status = 'posted' THEN 1 END) as posts_success,
            COUNT(p.clip_id) as posts_total
     FROM clips c
     LEFT JOIN posts p ON p.clip_id = c.id
     WHERE c.job_id = ?
     GROUP BY c.id
     ORDER BY c.rank ASC NULLS LAST`
  ).all(req.params.id) as Array<{
    id: string; start_ms: number; end_ms: number; rank: number | null;
    score: number | null; hook: string | null; posts_success: number; posts_total: number;
  }>;

  const countRow = {
    job_id: row.id,
    clips_generated: clips.length,
    posts_success: clips.reduce((s, c) => s + c.posts_success, 0),
    posts_total: clips.reduce((s, c) => s + c.posts_total, 0),
  };

  res.json({
    ...mapJob(row, countRow),
    clips: clips.map((c) => ({
      id: c.id,
      startMs: c.start_ms,
      endMs: c.end_ms,
      rank: c.rank,
      score: c.score,
      hook: c.hook,
      postsSuccess: c.posts_success,
      postsTotal: c.posts_total,
    })),
  });
});

// POST /api/jobs — create a job (manual ingest)
jobsRouter.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const { media_name, show_slug, drive_file_id } = req.body;

  if (!media_name) {
    res.status(400).json({ error: "media_name is required" });
    return;
  }

  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Math.floor(Date.now() / 1000);

  db.prepare(
    `INSERT INTO jobs (id, show_slug, media_name, drive_file_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  ).run(id, show_slug ?? null, media_name, drive_file_id ?? null, now, now);

  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRow;
  res.status(201).json(mapJob(row));
});

// PATCH /api/jobs/:id/retry — retry a failed job
jobsRouter.patch("/:id/retry", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id) as JobRow | undefined;

  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (row.status !== "failed") {
    res.status(409).json({ error: "Only failed jobs can be retried" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `UPDATE jobs SET status = 'pending', error = NULL, updated_at = ? WHERE id = ?`
  ).run(now, req.params.id);

  const updated = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id) as JobRow;
  res.json(mapJob(updated));
});
