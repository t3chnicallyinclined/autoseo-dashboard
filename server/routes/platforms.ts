import { Router } from "express";
import { getDb } from "../db.js";
import { getPlatformConfigs } from "../config.js";

const router = Router();

/**
 * GET /api/platforms
 * List configured platforms with connection status and aggregated stats.
 */
router.get("/", (_req, res) => {
  const db = getDb();
  const configs = getPlatformConfigs();

  // Aggregate post counts per platform
  const postCounts = db
    .prepare(
      `SELECT platform, COUNT(*) as total_posts
       FROM posts WHERE status = 'posted'
       GROUP BY platform`
    )
    .all() as { platform: string; total_posts: number }[];

  // Aggregate latest analytics per clip+platform (most recent fetched_at)
  const statsRows = db
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

  // Most recent post time per platform
  const lastPosts = db
    .prepare(
      `SELECT platform, MAX(posted_at) as last_posted_at
       FROM posts WHERE status = 'posted'
       GROUP BY platform`
    )
    .all() as { platform: string; last_posted_at: number | null }[];

  // YouTube quota: count posts today
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const ytQuota = db
    .prepare(
      `SELECT COUNT(*) as count FROM posts
       WHERE platform = 'youtube' AND status = 'posted' AND posted_at >= ?`
    )
    .get(todayStart) as { count: number };

  const postCountMap = Object.fromEntries(postCounts.map((r) => [r.platform, r.total_posts]));
  const statsMap = Object.fromEntries(statsRows.map((r) => [r.platform, r]));
  const lastPostMap = Object.fromEntries(lastPosts.map((r) => [r.platform, r.last_posted_at]));

  const result = configs.map((cfg) => {
    const stats = statsMap[cfg.id];
    const lastPostedAt = lastPostMap[cfg.id];

    return {
      id: cfg.id,
      name: cfg.name,
      icon: cfg.icon,
      status: cfg.status,
      handle: cfg.handle,
      color: cfg.color,
      totalPosts: postCountMap[cfg.id] || 0,
      totalViews: stats?.total_views || 0,
      avgCtr: stats ? Math.round(stats.avg_ctr * 10) / 10 : 0,
      avgWatch: stats ? Math.round(stats.avg_watch) : 0,
      quotaUsed: cfg.id === "youtube" ? ytQuota.count * 1600 : undefined,
      quotaTotal: cfg.quotaTotal ?? undefined,
      lastPost: lastPostedAt ? formatRelativeTime(lastPostedAt) : "Never",
      note: cfg.note ?? undefined,
    };
  });

  res.json(result);
});

function formatRelativeTime(unixSec: number): string {
  const diffMs = Date.now() - unixSec * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default router;
