import { Router, Request, Response } from "express";
import { getTrends, getLatestTrendsBySource, getMatchedTrends } from "../db.js";

export const trendsRouter = Router();

// GET /api/trends — all trends (optionally filtered by ?source=)
trendsRouter.get("/", (_req: Request, res: Response) => {
  try {
    const source = _req.query.source as string | undefined;
    const trends = getTrends(source);
    res.json({ trends });
  } catch (err) {
    console.error("GET /api/trends error:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// GET /api/trends/gdelt — GDELT topics
trendsRouter.get("/gdelt", (_req: Request, res: Response) => {
  try {
    const trends = getLatestTrendsBySource("gdelt");
    const formatted = trends.map((t) => ({
      topic: t.label ?? t.topic_id,
      score: t.score ?? 0,
      sources: 0, // source count not stored in DB; frontend can extend later
      tone: 0,    // tone not stored in DB; frontend can extend later
      matched: t.match_count,
    }));
    res.json({ gdelt: formatted });
  } catch (err) {
    console.error("GET /api/trends/gdelt error:", err);
    res.status(500).json({ error: "Failed to fetch GDELT trends" });
  }
});

// GET /api/trends/reddit — Reddit hot topics
trendsRouter.get("/reddit", (_req: Request, res: Response) => {
  try {
    const trends = getLatestTrendsBySource("reddit");
    const formatted = trends.map((t) => ({
      title: t.label ?? t.topic_id,
      subreddit: "", // subreddit not stored in DB schema
      score: t.score ?? 0,
      comments: 0,   // comments not stored in DB schema
    }));
    res.json({ reddit: formatted });
  } catch (err) {
    console.error("GET /api/trends/reddit error:", err);
    res.status(500).json({ error: "Failed to fetch Reddit trends" });
  }
});

// GET /api/trends/google — Google Trends
trendsRouter.get("/google", (_req: Request, res: Response) => {
  try {
    const trends = getLatestTrendsBySource("google");
    const formatted = trends.map((t) => ({
      term: t.label ?? t.topic_id,
      volume: t.score ?? 0,
      related: [], // related terms not stored in DB schema
    }));
    res.json({ google: formatted });
  } catch (err) {
    console.error("GET /api/trends/google error:", err);
    res.status(500).json({ error: "Failed to fetch Google trends" });
  }
});

// GET /api/trends/matched — trends matched to clips
trendsRouter.get("/matched", (_req: Request, res: Response) => {
  try {
    const matched = getMatchedTrends();
    res.json({ matched });
  } catch (err) {
    console.error("GET /api/trends/matched error:", err);
    res.status(500).json({ error: "Failed to fetch matched trends" });
  }
});
