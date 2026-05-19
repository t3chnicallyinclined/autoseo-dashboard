// Default: same-origin (empty string → relative URLs). Works whether the SPA
// is served by the autoseo backend on its own port, by `npm run dev` with the
// Vite `/api` proxy, or behind a reverse proxy / ngrok tunnel.
// Set VITE_API_URL only when the API lives on a different origin than the SPA.
const API_BASE = import.meta.env.VITE_API_URL ?? ""

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export interface ClipRender {
  clip_id: string
  variant: string
  path: string
  bytes: number | null
  duration_ms: number | null
}

export interface ClipPost {
  clip_id: string
  platform: string
  status: string
  external_id: string | null
  external_url: string | null
  posted_at: number | null
  error: string | null
}

export interface JobSummary {
  id: string
  show_slug: string | null
  media_name: string | null
  status: string
}

export interface Clip {
  id: string
  job_id: string
  start_ms: number
  end_ms: number
  rank: number | null
  score: number | null
  hook: string | null
  reasoning_json: string | null
  trend_match: string | null
  status: string
  social_copy_json: string | null
  renders: ClipRender[]
  posts: ClipPost[]
  job: JobSummary | null
}

export async function listClips(status?: string): Promise<Clip[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : ""
  const data = await request<{ clips: Clip[] }>(`/api/clips${params}`)
  return data.clips
}

export async function getClip(id: string): Promise<Clip> {
  const data = await request<{ clip: Clip }>(`/api/clips/${encodeURIComponent(id)}`)
  return data.clip
}

export async function patchClip(id: string, body: {
  hook?: string
  status?: string
  social_copy_json?: string
}): Promise<Clip> {
  const data = await request<{ clip: Clip }>(`/api/clips/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return data.clip
}

export async function approveClip(id: string): Promise<Clip> {
  const data = await request<{ clip: Clip }>(`/api/clips/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  })
  return data.clip
}

export async function vetoClip(id: string): Promise<Clip> {
  const data = await request<{ clip: Clip }>(`/api/clips/${encodeURIComponent(id)}/veto`, {
    method: "POST",
  })
  return data.clip
}

export async function postClip(id: string, platforms: string[]): Promise<Clip> {
  const data = await request<{ clip: Clip }>(`/api/clips/${encodeURIComponent(id)}/post`, {
    method: "POST",
    body: JSON.stringify({ platforms }),
  })
  return data.clip
}

export async function bulkAction(clipIds: string[], action: string, platforms?: string[]): Promise<{ updated: number }> {
  return request<{ updated: number }>(`/api/clips/bulk`, {
    method: "POST",
    body: JSON.stringify({ clip_ids: clipIds, action, platforms }),
  })
}

// ── Analytics ─────────────────────────────────────────────────────────

export type DateRange = "7d" | "30d" | "90d"

export interface OverviewData {
  total_views: number
  avg_ctr: number
  avg_watch_pct: number
  clip_count: number
}

// One row per date with per-platform view totals. Platform keys are filled
// in by the backend pivot (currently youtube/bluesky/linkedin/threads).
export interface ViewsRow {
  date: string
  youtube: number
  bluesky: number
  linkedin: number
  threads: number
}

export interface CtrRow {
  platform: string
  ctr: number
}

export interface WatchBucket {
  bucket: string
  count: number
}

export interface ScatterPoint {
  clip_id: string
  hook: string
  score: number
  ctr: number
  views: number
}

export interface TopClip {
  rank: number
  hook: string
  episode: string
  platform: string
  views: number
  ctr: number
  watchPct: number
  score: number
}

export interface ShowStats {
  show: string
  total_views: number
  avg_ctr: number
  avg_watch_pct: number
  clip_count: number
}

export const analyticsApi = {
  overview: (range: DateRange) =>
    request<OverviewData>(`/api/analytics/overview?range=${range}`),
  views: (range: DateRange) =>
    request<ViewsRow[]>(`/api/analytics/views?range=${range}`),
  ctr: (range: DateRange) =>
    request<CtrRow[]>(`/api/analytics/ctr?range=${range}`),
  watchDistribution: (range: DateRange) =>
    request<WatchBucket[]>(`/api/analytics/watch-distribution?range=${range}`),
  scoreVsPerformance: (range: DateRange) =>
    request<ScatterPoint[]>(`/api/analytics/score-vs-performance?range=${range}`),
  topClips: (range: DateRange, limit?: number) => {
    const q = limit ? `?range=${range}&limit=${limit}` : `?range=${range}`
    return request<TopClip[]>(`/api/analytics/top-clips${q}`)
  },
  byShow: (range: DateRange) =>
    request<ShowStats[]>(`/api/analytics/by-show?range=${range}`),
}
