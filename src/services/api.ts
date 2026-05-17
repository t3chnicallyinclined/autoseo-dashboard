const API_BASE = import.meta.env.VITE_API_BASE ?? "/api"

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(body || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export type JobStatus = "pending" | "transcribing" | "rendering" | "paused" | "done" | "failed" | "cancelled"

export interface Job {
  id: string
  episodeId: string | null
  showId: string
  media: string
  status: JobStatus
  stage: string
  progress: number
  clipsGenerated: number
  postsSuccess: number
  postsTotal: number
  cost: number
  duration: string
  created: string
  error?: string
}

export const jobsApi = {
  list: () => request<Job[]>("/jobs"),
  get: (id: string) => request<Job>(`/jobs/${encodeURIComponent(id)}`),
  pause: (id: string) => request<Job>(`/jobs/${encodeURIComponent(id)}/pause`, { method: "PATCH" }),
  resume: (id: string) => request<Job>(`/jobs/${encodeURIComponent(id)}/resume`, { method: "PATCH" }),
  retry: (id: string) => request<Job>(`/jobs/${encodeURIComponent(id)}/retry`, { method: "PATCH" }),
  cancel: (id: string) => request<Job>(`/jobs/${encodeURIComponent(id)}/cancel`, { method: "PATCH" }),
  delete: (id: string) => request<void>(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" }),
}

export type JobWsEvent =
  | { type: "job_updated"; job: Job }
  | { type: "job_deleted"; jobId: string }

export function connectJobsWs(onEvent: (e: JobWsEvent) => void): () => void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const wsBase = import.meta.env.VITE_WS_BASE ?? `${protocol}//${window.location.host}`
  let ws: WebSocket | null = null
  let disposed = false
  let retryDelay = 1000

  function connect() {
    if (disposed) return
    ws = new WebSocket(`${wsBase}/ws/jobs`)
    ws.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data))
      } catch { /* ignore malformed */ }
    }
    ws.onclose = () => {
      if (disposed) return
      setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 30000)
    }
    ws.onopen = () => { retryDelay = 1000 }
  }

  connect()
  return () => { disposed = true; ws?.close() }
}
