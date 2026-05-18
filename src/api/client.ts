import * as sample from "@/data/sample"

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
  getClips: withFallback(
    () => api.get("/api/clips"),
    sample.clips,
  ),
  getClip: (id: string) =>
    withFallback(
      () => api.get(`/api/clips/${id}`),
      sample.clips.find((c) => c.id === id) ?? sample.clips[0],
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
