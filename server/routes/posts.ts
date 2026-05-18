import { Router } from "express";
import { execFile } from "child_process";
import { getDb } from "../db.js";

const router = Router();

/**
 * GET /api/clips/:id/posts
 * List posts for a specific clip, with latest analytics per platform.
 */
router.get("/clips/:id/posts", (req, res) => {
  const db = getDb();
  const clipId = req.params.id;

  // Verify clip exists
  const clip = db.prepare("SELECT id FROM clips WHERE id = ?").get(clipId);
  if (!clip) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }

  const posts = db
    .prepare(
      `SELECT p.clip_id, p.platform, p.status, p.external_id, p.external_url,
              p.posted_at, p.error,
              a.views, a.ctr, a.watch_pct
       FROM posts p
       LEFT JOIN (
         SELECT clip_id, platform, views, ctr, watch_pct
         FROM analytics
         WHERE (clip_id, platform, fetched_at) IN (
           SELECT clip_id, platform, MAX(fetched_at)
           FROM analytics GROUP BY clip_id, platform
         )
       ) a ON p.clip_id = a.clip_id AND p.platform = a.platform
       WHERE p.clip_id = ?`
    )
    .all(clipId);

  res.json(posts);
});

/**
 * POST /api/clips/:id/post
 * Trigger posting to one or all platforms.
 * Body: { platform?: string } — omit platform to post to all enabled platforms.
 */
router.post("/clips/:id/post", (req, res) => {
  const db = getDb();
  const clipId = req.params.id;
  const { platform } = req.body as { platform?: string };

  // Verify clip exists
  const clip = db
    .prepare("SELECT c.id, c.job_id, cr.path FROM clips c LEFT JOIN clip_renders cr ON c.id = cr.clip_id AND cr.variant = '9x16' WHERE c.id = ?")
    .get(clipId) as { id: string; job_id: string; path: string | null } | undefined;

  if (!clip) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }

  if (!clip.path) {
    res.status(400).json({ error: "No rendered video found for this clip" });
    return;
  }

  // Build autoseo CLI args for posting
  const args = ["--local-video-path", clip.path, "--mode", "clipper"];
  if (platform) {
    args.push("--post-enabled-platforms", platform);
  }
  args.push("--post-dry-run", process.env.POST_DRY_RUN !== "false" ? "true" : "false");

  const autoseoBin = process.env.AUTOSEO_BIN || "autoseo";

  execFile(autoseoBin, args, { timeout: 120000 }, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({
        error: "Posting failed",
        detail: stderr || error.message,
      });
      return;
    }

    // Re-read posts for this clip to return updated status
    const posts = db
      .prepare("SELECT * FROM posts WHERE clip_id = ?")
      .all(clipId);

    res.json({ status: "ok", posts });
  });
});

/**
 * PATCH /api/clips/:id/posts/:platform/veto
 * Veto (remove) a post from a platform.
 */
router.patch("/clips/:id/posts/:platform/veto", (req, res) => {
  const db = getDb();
  const { id: clipId, platform } = req.params;

  const existing = db
    .prepare("SELECT status FROM posts WHERE clip_id = ? AND platform = ?")
    .get(clipId, platform) as { status: string } | undefined;

  if (!existing) {
    // Create a vetoed record if no post exists yet
    db.prepare(
      `INSERT INTO posts (clip_id, platform, status, posted_at)
       VALUES (?, ?, 'vetoed', ?)`
    ).run(clipId, platform, Math.floor(Date.now() / 1000));
  } else {
    db.prepare(
      "UPDATE posts SET status = 'vetoed', error = 'Vetoed by user' WHERE clip_id = ? AND platform = ?"
    ).run(clipId, platform);
  }

  res.json({ status: "ok", clip_id: clipId, platform, post_status: "vetoed" });
});

/**
 * GET /api/posts/stats
 * Aggregated posting stats grouped by platform.
 */
router.get("/posts/stats", (_req, res) => {
  const db = getDb();

  const stats = db
    .prepare(
      `SELECT
        p.platform,
        COUNT(*) FILTER (WHERE p.status = 'posted') as posted,
        COUNT(*) FILTER (WHERE p.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE p.status = 'skipped') as skipped,
        COUNT(*) FILTER (WHERE p.status = 'dry-run') as dry_run,
        COUNT(*) FILTER (WHERE p.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE p.status = 'vetoed') as vetoed,
        COUNT(*) as total
       FROM posts p
       GROUP BY p.platform`
    )
    .all() as {
    platform: string;
    posted: number;
    failed: number;
    skipped: number;
    dry_run: number;
    pending: number;
    vetoed: number;
    total: number;
  }[];

  // Join with latest analytics
  const analyticsStats = db
    .prepare(
      `SELECT a.platform,
              SUM(a.views) as total_views,
              AVG(a.ctr) as avg_ctr,
              AVG(a.watch_pct) as avg_watch
       FROM analytics a
       INNER JOIN (
         SELECT clip_id, platform, MAX(fetched_at) as max_fetched
         FROM analytics GROUP BY clip_id, platform
       ) latest ON a.clip_id = latest.clip_id
                AND a.platform = latest.platform
                AND a.fetched_at = latest.max_fetched
       GROUP BY a.platform`
    )
    .all() as { platform: string; total_views: number; avg_ctr: number; avg_watch: number }[];

  const analyticsMap = Object.fromEntries(analyticsStats.map((r) => [r.platform, r]));

  const result = stats.map((s) => {
    const a = analyticsMap[s.platform];
    return {
      platform: s.platform,
      posted: s.posted,
      failed: s.failed,
      skipped: s.skipped,
      dryRun: s.dry_run,
      pending: s.pending,
      vetoed: s.vetoed,
      total: s.total,
      totalViews: a?.total_views || 0,
      avgCtr: a ? Math.round(a.avg_ctr * 10) / 10 : 0,
      avgWatch: a ? Math.round(a.avg_watch) : 0,
    };
  });

  res.json(result);
});

export default router;
