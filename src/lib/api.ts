const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"

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
