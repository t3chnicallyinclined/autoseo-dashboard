import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { getDb, getDbPath } from "./db";

export const clipsRouter = Router();

// GET /api/clips — list clips (paginated, filterable)
clipsRouter.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.query.job_id) {
    conditions.push("c.job_id = ?");
    params.push(req.query.job_id);
  }
  if (req.query.min_rank) {
    conditions.push("c.rank >= ?");
    params.push(parseInt(req.query.min_rank as string));
  }
  if (req.query.max_rank) {
    conditions.push("c.rank <= ?");
    params.push(parseInt(req.query.max_rank as string));
  }
  if (req.query.min_score) {
    conditions.push("c.score >= ?");
    params.push(parseFloat(req.query.min_score as string));
  }
  if (req.query.status) {
    conditions.push("COALESCE(clip_status.status, 'generated') = ?");
    params.push(req.query.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Subquery to derive clip status from posts
  const statusSubquery = `
    LEFT JOIN (
      SELECT clip_id,
        CASE
          WHEN COUNT(*) = 0 THEN 'generated'
          WHEN SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) > 0 THEN 'posted'
          WHEN SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) > 0 THEN 'approved'
          ELSE 'generated'
        END as status
      FROM posts GROUP BY clip_id
    ) clip_status ON clip_status.clip_id = c.id
  `;

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM clips c ${statusSubquery} ${where}
  `).get(...params) as { total: number };

  const rows = db.prepare(`
    SELECT
      c.id,
      c.job_id as "jobId",
      j.show_slug as "showSlug",
      c.start_ms as "startMs",
      c.end_ms as "endMs",
      c.rank,
      c.score as "llmScore",
      c.hook,
      c.trend_match as "trendMatch",
      COALESCE(clip_status.status, 'generated') as status,
      cr.path as "thumbnailPath",
      (c.end_ms - c.start_ms) as "durationMs"
    FROM clips c
    JOIN jobs j ON j.id = c.job_id
    ${statusSubquery}
    LEFT JOIN clip_renders cr ON cr.clip_id = c.id AND cr.variant = 'thumbnail'
    ${where}
    ORDER BY c.rank ASC, c.score DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Record<string, unknown>[];

  // Aggregate platform status for each clip
  const clipIds = rows.map((r) => r.id);
  const platformMap: Record<string, Record<string, string>> = {};
  if (clipIds.length > 0) {
    const placeholders = clipIds.map(() => "?").join(",");
    const posts = db.prepare(`
      SELECT clip_id, platform, status FROM posts WHERE clip_id IN (${placeholders})
    `).all(...clipIds) as { clip_id: string; platform: string; status: string }[];
    for (const p of posts) {
      if (!platformMap[p.clip_id]) platformMap[p.clip_id] = {};
      platformMap[p.clip_id][p.platform] = p.status;
    }
  }

  // Aggregate analytics (latest per platform)
  const analyticsMap: Record<string, { views: number; ctr: number; watchPct: number }> = {};
  if (clipIds.length > 0) {
    const placeholders = clipIds.map(() => "?").join(",");
    const analytics = db.prepare(`
      SELECT clip_id, SUM(views) as views, AVG(ctr) as ctr, AVG(watch_pct) as "watchPct"
      FROM (
        SELECT a.clip_id, a.platform, a.views, a.ctr, a.watch_pct,
          ROW_NUMBER() OVER (PARTITION BY a.clip_id, a.platform ORDER BY a.fetched_at DESC) as rn
        FROM analytics a WHERE a.clip_id IN (${placeholders})
      ) WHERE rn = 1
      GROUP BY clip_id
    `).all(...clipIds) as { clip_id: string; views: number; ctr: number; watchPct: number }[];
    for (const a of analytics) {
      analyticsMap[a.clip_id] = { views: a.views || 0, ctr: a.ctr || 0, watchPct: a.watchPct || 0 };
    }
  }

  const data = rows.map((row) => ({
    id: row.id,
    episodeId: row.jobId,
    rank: row.rank,
    hook: row.hook,
    duration: formatDuration(row.durationMs as number),
    llmScore: row.llmScore,
    vlmScore: null, // VLM score stored in reasoning_json if available
    status: row.status,
    thumbnail: row.thumbnailPath || null,
    platforms: platformMap[row.id as string] || {},
    views: analyticsMap[row.id as string]?.views || 0,
    ctr: analyticsMap[row.id as string]?.ctr || 0,
    watchPct: analyticsMap[row.id as string]?.watchPct || 0,
  }));

  res.json({
    data,
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  });
});

// GET /api/clips/stats — aggregate stats
clipsRouter.get("/stats", (_req: Request, res: Response) => {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as "totalClips",
      COUNT(CASE WHEN EXISTS (SELECT 1 FROM posts p WHERE p.clip_id = c.id AND p.status = 'posted') THEN 1 END) as "postedClips",
      AVG(c.score) as "avgScore",
      SUM(c.end_ms - c.start_ms) / 1000 as "totalDurationSec"
    FROM clips c
  `).get() as Record<string, unknown>;

  const viewStats = db.prepare(`
    SELECT
      COALESCE(SUM(a.views), 0) as "totalViews",
      COALESCE(AVG(a.ctr), 0) as "avgCtr",
      COALESCE(AVG(a.watch_pct), 0) as "avgWatchPct"
    FROM (
      SELECT clip_id, platform, views, ctr, watch_pct,
        ROW_NUMBER() OVER (PARTITION BY clip_id, platform ORDER BY fetched_at DESC) as rn
      FROM analytics
    ) a WHERE a.rn = 1
  `).get() as Record<string, unknown>;

  res.json({ ...stats, ...viewStats });
});

// GET /api/clips/leaderboard — top clips by views/CTR
clipsRouter.get("/leaderboard", (req: Request, res: Response) => {
  const db = getDb();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortBy = (req.query.sort_by as string) || "views";
  const validSorts = ["views", "ctr", "watch_pct"];
  const sortColumn = validSorts.includes(sortBy) ? sortBy : "views";

  const rows = db.prepare(`
    SELECT
      c.id, c.hook, c.rank, c.score as "llmScore", c.job_id as "jobId",
      j.show_slug as "showSlug",
      (c.end_ms - c.start_ms) as "durationMs",
      COALESCE(a.views, 0) as views,
      COALESCE(a.ctr, 0) as ctr,
      COALESCE(a.watch_pct, 0) as "watchPct"
    FROM clips c
    JOIN jobs j ON j.id = c.job_id
    LEFT JOIN (
      SELECT clip_id, SUM(views) as views, AVG(ctr) as ctr, AVG(watch_pct) as watch_pct
      FROM (
        SELECT clip_id, platform, views, ctr, watch_pct,
          ROW_NUMBER() OVER (PARTITION BY clip_id, platform ORDER BY fetched_at DESC) as rn
        FROM analytics
      ) WHERE rn = 1
      GROUP BY clip_id
    ) a ON a.clip_id = c.id
    ORDER BY ${sortColumn} DESC
    LIMIT ?
  `).all(limit) as Record<string, unknown>[];

  res.json(rows.map((row) => ({
    id: row.id,
    hook: row.hook,
    rank: row.rank,
    llmScore: row.llmScore,
    episodeId: row.jobId,
    showSlug: row.showSlug,
    duration: formatDuration(row.durationMs as number),
    views: row.views,
    ctr: row.ctr,
    watchPct: row.watchPct,
  })));
});

// GET /api/clips/:id — full clip detail
clipsRouter.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const clip = db.prepare(`
    SELECT
      c.id, c.job_id as "jobId", c.start_ms as "startMs", c.end_ms as "endMs",
      c.rank, c.score as "llmScore", c.hook, c.reasoning_json as "reasoningJson",
      c.trend_match as "trendMatch",
      j.show_slug as "showSlug", j.media_name as "mediaName",
      (c.end_ms - c.start_ms) as "durationMs"
    FROM clips c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!clip) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }

  const renders = db.prepare(`
    SELECT clip_id as "clipId", variant, path, bytes, duration_ms as "durationMs"
    FROM clip_renders WHERE clip_id = ?
  `).all(id) as Record<string, unknown>[];

  const posts = db.prepare(`
    SELECT clip_id as "clipId", platform, status, external_id as "externalId",
      external_url as "externalUrl", posted_at as "postedAt", error
    FROM posts WHERE clip_id = ?
  `).all(id) as Record<string, unknown>[];

  const analytics = db.prepare(`
    SELECT clip_id as "clipId", platform, fetched_at as "fetchedAt", views, ctr, watch_pct as "watchPct"
    FROM analytics WHERE clip_id = ? ORDER BY fetched_at DESC
  `).all(id) as Record<string, unknown>[];

  // Aggregate platform statuses
  const platforms: Record<string, string> = {};
  for (const p of posts as { platform: string; status: string }[]) {
    platforms[p.platform] = p.status;
  }

  // Latest analytics per platform
  const latestAnalytics: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const a of analytics as { platform: string; views: number; ctr: number; watchPct: number }[]) {
    if (!seen.has(a.platform)) {
      seen.add(a.platform);
      latestAnalytics.push(a);
    }
  }

  // Derive status
  let status = "generated";
  if (posts.length > 0) {
    const hasPosted = (posts as { status: string }[]).some((p) => p.status === "posted");
    const hasPending = (posts as { status: string }[]).some((p) => p.status === "pending");
    if (hasPosted) status = "posted";
    else if (hasPending) status = "approved";
  }

  // Parse VLM score from reasoning_json if present
  let vlmScore: number | null = null;
  if (clip.reasoningJson) {
    try {
      const reasoning = JSON.parse(clip.reasoningJson as string);
      vlmScore = reasoning.vlm_score ?? reasoning.vlmScore ?? null;
    } catch { /* ignore */ }
  }

  res.json({
    id: clip.id,
    episodeId: clip.jobId,
    showSlug: clip.showSlug,
    rank: clip.rank,
    hook: clip.hook,
    duration: formatDuration(clip.durationMs as number),
    durationMs: clip.durationMs,
    startMs: clip.startMs,
    endMs: clip.endMs,
    llmScore: clip.llmScore,
    vlmScore,
    status,
    trendMatch: clip.trendMatch,
    thumbnail: renders.find((r) => (r as { variant: string }).variant === "thumbnail")
      ? (renders.find((r) => (r as { variant: string }).variant === "thumbnail") as { path: string }).path
      : null,
    platforms,
    renders,
    posts,
    analytics: latestAnalytics,
    views: latestAnalytics.reduce((sum, a) => sum + ((a as { views: number }).views || 0), 0),
    ctr: latestAnalytics.length > 0
      ? latestAnalytics.reduce((sum, a) => sum + ((a as { ctr: number }).ctr || 0), 0) / latestAnalytics.length
      : 0,
    watchPct: latestAnalytics.length > 0
      ? latestAnalytics.reduce((sum, a) => sum + ((a as { watchPct: number }).watchPct || 0), 0) / latestAnalytics.length
      : 0,
  });
});

// PATCH /api/clips/:id — update clip (edit hook, approve, veto)
clipsRouter.patch("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { hook, status } = req.body;

  // Need writable db for updates
  const writeDb = new Database(getDbPath());

  try {
    const clip = writeDb.prepare("SELECT id FROM clips WHERE id = ?").get(id);
    if (!clip) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }

    if (hook !== undefined) {
      writeDb.prepare("UPDATE clips SET hook = ? WHERE id = ?").run(hook, id);
    }

    if (status === "approved") {
      // Insert pending posts for all configured platforms (if not already present)
      const existing = writeDb.prepare("SELECT platform FROM posts WHERE clip_id = ?").all(id) as { platform: string }[];
      const existingPlatforms = new Set(existing.map((p) => p.platform));
      const defaultPlatforms = ["youtube", "bluesky"];
      for (const platform of defaultPlatforms) {
        if (!existingPlatforms.has(platform)) {
          writeDb.prepare("INSERT INTO posts (clip_id, platform, status) VALUES (?, ?, 'pending')").run(id, platform);
        }
      }
    } else if (status === "vetoed") {
      // Remove any pending posts
      writeDb.prepare("DELETE FROM posts WHERE clip_id = ? AND status = 'pending'").run(id);
    }

    res.json({ id, updated: true });
  } finally {
    writeDb.close();
  }
});

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
