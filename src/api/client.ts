import * as sample from "@/data/sample"
import type { Clip, ClipStatus, ClipSocial, ClipVariant, PlatformPostStatus } from "./types"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""
const USE_SAMPLE = import.meta.env.VITE_USE_SAMPLE === "true"

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new ApiError(res.status, body || `${res.status} ${res.statusText}`)
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}

// Raw Rust /api/clips response shape — what the autoseo backend returns.
interface RustClipPost {
  platform: string
  status: string
  external_url?: string | null
}
interface RustClipRender {
  variant: string
  path: string
  bytes?: number | null
  duration_ms?: number | null
}
interface RustClipVariant {
  variant: string
  url?: string | null
  bytes?: number | null
  duration_ms?: number | null
}
interface RustClip {
  id: string
  job_id: string
  start_ms: number
  end_ms: number
  rank?: number | null
  score?: number | null
  hook?: string | null
  status?: string | null
  reasoning_json?: string | null
  posts?: RustClipPost[] | null
  renders?: RustClipRender[] | null
  // Enriched-from-manifest fields (when manifest.json exists next to renders)
  variants?: RustClipVariant[] | null
  cover_url?: string | null
  social?: ClipSocial | null
  overlay_hook?: string | null
  hook_source?: string | null
}

const KNOWN_STATUSES: ClipStatus[] = ["posted", "approved", "generated", "vetoed"]

/** Convert a Rust clip row into the dashboard's expected Clip shape. */
function adaptRustClip(c: RustClip): Clip {
  const durSecs = Math.max(0, Math.floor((c.end_ms - c.start_ms) / 1000))
  const mm = Math.floor(durSecs / 60)
  const ss = String(durSecs % 60).padStart(2, "0")
  const platforms: Record<string, PlatformPostStatus> = {}
  for (const p of c.posts ?? []) {
    platforms[p.platform] = (p.status as PlatformPostStatus) ?? "pending"
  }
  const status: ClipStatus = KNOWN_STATUSES.includes(c.status as ClipStatus)
    ? (c.status as ClipStatus)
    : "generated"

  // Prefer the enriched `variants` (which include /media URLs); fall back to
  // raw `renders` (path-only) so older API responses still produce something.
  const variants: ClipVariant[] = (c.variants ?? []).map(v => ({
    variant: v.variant,
    url: v.url ?? null,
    bytes: v.bytes ?? null,
    duration_ms: v.duration_ms ?? null,
  }))
  if (variants.length === 0) {
    for (const r of c.renders ?? []) {
      variants.push({
        variant: r.variant,
        url: null,
        bytes: r.bytes ?? null,
        duration_ms: r.duration_ms ?? null,
      })
    }
  }

  return {
    id: c.id,
    episodeId: c.job_id,
    rank: c.rank ?? 0,
    hook: c.hook ?? "",
    duration: `${mm}:${ss}`,
    llmScore: c.score ?? 0,
    vlmScore: 0,
    status,
    thumbnail: c.cover_url ?? "",
    platforms,
    views: 0,
    ctr: 0,
    watchPct: 0,
    variants,
    social: c.social ?? null,
    overlayHook: c.overlay_hook ?? null,
    hookSource: c.hook_source ?? null,
    reasoning: c.reasoning_json ?? null,
  }
}

// Fallback helper: tries API first, falls back to sample data in dev
export function withFallback<T>(
  apiFn: () => Promise<T>,
  sampleData: T,
): () => Promise<T> {
  if (USE_SAMPLE) {
    return () => Promise.resolve(sampleData)
  }
  return async () => {
    try {
      return await apiFn()
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[api] Falling back to sample data:", err)
        return sampleData
      }
      throw err
    }
  }
}

// Pre-built fetchers with sample fallback
export const fetchers = {
  getShows: withFallback(
    () => api.get("/api/shows"),
    sample.shows,
  ),
  getEpisodes: withFallback(
    () => api.get("/api/episodes"),
    sample.episodes,
  ),
  // The Rust /api/clips endpoint wraps the list in `{ clips: [...] }` and uses
  // a different shape than the dashboard's older Clip type (snake_case + a
  // `posts` array vs the sample's camelCase + `platforms` map). Adapt the
  // Rust shape to what the dashboard pages expect, filling unknown fields
  // with neutral defaults.
  getClips: withFallback<Clip[]>(
    async () => {
      const data = await api.get<{ clips: RustClip[] }>("/api/clips")
      return data.clips.map(adaptRustClip)
    },
    sample.clips as unknown as Clip[],
  ),
  getClip: (id: string) =>
    withFallback<Clip>(
      async () => {
        const data = await api.get<{ clip: RustClip }>(`/api/clips/${id}`)
        return adaptRustClip(data.clip)
      },
      (sample.clips.find((c) => c.id === id) ?? sample.clips[0]) as unknown as Clip,
    )(),
  getJobs: withFallback(
    () => api.get("/api/jobs"),
    sample.jobs,
  ),
  getJob: (id: string) =>
    withFallback(
      () => api.get(`/api/jobs/${id}`),
      sample.jobs.find((j) => j.id === id) ?? sample.jobs[0],
    )(),
  getPlatforms: withFallback(
    () => api.get("/api/platforms"),
    sample.platforms,
  ),
  getTrends: withFallback(
    () => api.get("/api/trends"),
    sample.trendingTopics,
  ),
  getAgents: withFallback(
    () => api.get("/api/agents"),
    sample.agents,
  ),
  getCostData: withFallback(
    () => api.get("/api/cost"),
    sample.costData,
  ),
  getAnalytics: withFallback(
    () => api.get("/api/analytics"),
    sample.analyticsData,
  ),
  getPipelineStatus: withFallback(
    () => api.get("/api/pipeline/status"),
    sample.pipelineStages,
  ),
}

export { ApiError }
