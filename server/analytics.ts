import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";

export function analyticsRouter(db: Database.Database): Router {
  const router = Router();

  /** Parse date-range query params into unix timestamps */
  function dateRange(req: Request): { from: number; to: number } {
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;

    if (req.query.from && req.query.to) {
      return {
        from: Math.floor(new Date(req.query.from as string).getTime() / 1000),
        to: Math.floor(new Date(req.query.to as string).getTime() / 1000),
      };
    }

    const range = (req.query.range as string) ?? "7d";
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    return { from: now - days * day, to: now };
  }

  // GET /api/analytics/overview — KPI summary
  router.get("/overview", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);

    const row = db.prepare(`
      SELECT
        COALESCE(SUM(a.views), 0) AS total_views,
        COALESCE(AVG(a.ctr), 0) AS avg_ctr,
        COALESCE(AVG(a.watch_pct), 0) AS avg_watch_pct,
        COUNT(DISTINCT a.clip_id) AS clip_count
      FROM analytics a
      WHERE a.fetched_at BETWEEN ? AND ?
    `).get(from, to) as Record<string, number>;

    res.json({
      total_views: row.total_views,
      avg_ctr: +row.avg_ctr.toFixed(1),
      avg_watch_pct: +row.avg_watch_pct.toFixed(1),
      clip_count: row.clip_count,
    });
  });

  // GET /api/analytics/views — views over time (area chart)
  router.get("/views", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);

    const rows = db.prepare(`
      SELECT
        DATE(a.fetched_at, 'unixepoch') AS date,
        a.platform,
        SUM(a.views) AS views
      FROM analytics a
      WHERE a.fetched_at BETWEEN ? AND ?
      GROUP BY date, a.platform
      ORDER BY date
    `).all(from, to) as Array<{ date: string; platform: string; views: number }>;

    // Pivot: group by date with platform columns
    const byDate = new Map<string, Record<string, number>>();
    for (const r of rows) {
      if (!byDate.has(r.date)) {
        byDate.set(r.date, { youtube: 0, bluesky: 0, linkedin: 0, threads: 0 });
      }
      byDate.get(r.date)![r.platform] = r.views;
    }

    const result = Array.from(byDate.entries()).map(([date, platforms]) => ({
      date,
      ...platforms,
    }));

    res.json(result);
  });

  // GET /api/analytics/ctr — CTR by platform (bar chart)
  router.get("/ctr", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);

    const rows = db.prepare(`
      SELECT
        a.platform,
        AVG(a.ctr) AS avg_ctr
      FROM analytics a
      WHERE a.fetched_at BETWEEN ? AND ?
      GROUP BY a.platform
      ORDER BY avg_ctr DESC
    `).all(from, to) as Array<{ platform: string; avg_ctr: number }>;

    res.json(rows.map(r => ({
      platform: r.platform,
      ctr: +r.avg_ctr.toFixed(1),
    })));
  });

  // GET /api/analytics/watch-distribution — watch % histogram
  router.get("/watch-distribution", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);

    const rows = db.prepare(`
      SELECT
        CASE
          WHEN a.watch_pct < 25 THEN '0-25%'
          WHEN a.watch_pct < 50 THEN '25-50%'
          WHEN a.watch_pct < 75 THEN '50-75%'
          ELSE '75-100%'
        END AS bucket,
        COUNT(*) AS count
      FROM analytics a
      WHERE a.fetched_at BETWEEN ? AND ?
      GROUP BY bucket
      ORDER BY bucket
    `).all(from, to) as Array<{ bucket: string; count: number }>;

    res.json(rows);
  });

  // GET /api/analytics/score-vs-performance — scatter plot
  router.get("/score-vs-performance", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);

    const rows = db.prepare(`
      SELECT
        c.id AS clip_id,
        c.hook,
        c.score,
        AVG(a.ctr) AS ctr,
        SUM(a.views) AS views
      FROM clips c
      JOIN analytics a ON a.clip_id = c.id
      WHERE a.fetched_at BETWEEN ? AND ?
      GROUP BY c.id
      HAVING SUM(a.views) > 0
    `).all(from, to) as Array<{ clip_id: string; hook: string; score: number; ctr: number; views: number }>;

    res.json(rows.map(r => ({
      clip_id: r.clip_id,
      hook: r.hook,
      score: r.score,
      ctr: +r.ctr.toFixed(1),
      views: r.views,
    })));
  });

  // GET /api/analytics/top-clips — leaderboard
  router.get("/top-clips", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const rows = db.prepare(`
      SELECT
        c.hook,
        j.media_name AS episode,
        a.platform,
        SUM(a.views) AS views,
        AVG(a.ctr) AS ctr,
        AVG(a.watch_pct) AS watch_pct,
        c.score
      FROM clips c
      JOIN jobs j ON j.id = c.job_id
      JOIN analytics a ON a.clip_id = c.id
      WHERE a.fetched_at BETWEEN ? AND ?
      GROUP BY c.id, a.platform
      ORDER BY views DESC
      LIMIT ?
    `).all(from, to, limit) as Array<{
      hook: string; episode: string; platform: string;
      views: number; ctr: number; watch_pct: number; score: number;
    }>;

    res.json(rows.map((r, i) => ({
      rank: i + 1,
      hook: r.hook,
      episode: r.episode,
      platform: r.platform,
      views: r.views,
      ctr: +r.ctr.toFixed(1),
      watchPct: +r.watch_pct.toFixed(1),
      score: r.score,
    })));
  });

  // GET /api/analytics/by-show — show comparison
  router.get("/by-show", (req: Request, res: Response) => {
    const { from, to } = dateRange(req);

    const rows = db.prepare(`
      SELECT
        j.show_slug,
        SUM(a.views) AS total_views,
        AVG(a.ctr) AS avg_ctr,
        AVG(a.watch_pct) AS avg_watch_pct,
        COUNT(DISTINCT c.id) AS clip_count
      FROM analytics a
      JOIN clips c ON c.id = a.clip_id
      JOIN jobs j ON j.id = c.job_id
      WHERE a.fetched_at BETWEEN ? AND ?
      GROUP BY j.show_slug
      ORDER BY total_views DESC
    `).all(from, to) as Array<{
      show_slug: string; total_views: number; avg_ctr: number;
      avg_watch_pct: number; clip_count: number;
    }>;

    res.json(rows.map(r => ({
      show: r.show_slug,
      total_views: r.total_views,
      avg_ctr: +r.avg_ctr.toFixed(1),
      avg_watch_pct: +r.avg_watch_pct.toFixed(1),
      clip_count: r.clip_count,
    })));
  });

  return router;
}
