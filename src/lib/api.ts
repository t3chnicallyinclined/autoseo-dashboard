const API_BASE = import.meta.env.VITE_API_BASE ?? "/api"

export interface CreateJobResponse {
  id: string
  status: string
}

export async function createJobWithFile(
  file: File,
  showId: string,
  onProgress?: (pct: number) => void,
): Promise<CreateJobResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("show_id", showId)

  const xhr = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })
    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.open("POST", `${API_BASE}/jobs`)
    xhr.send(formData)
  })
}

export async function createJobWithDriveUrl(
  driveUrl: string,
  showId: string,
): Promise<CreateJobResponse> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drive_url: driveUrl, show_id: showId }),
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ── Analytics API ──────────────────────────────────────────────────────

const ANALYTICS_BASE = "/api/analytics";

export type DateRange = "7d" | "30d" | "90d" | { from: string; to: string };

function rangeParams(range: DateRange): string {
  if (typeof range === "string") return `range=${range}`;
  return `from=${range.from}&to=${range.to}`;
}

async function getAnalytics<T>(path: string, range: DateRange = "7d"): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${ANALYTICS_BASE}${path}${sep}${rangeParams(range)}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export interface OverviewData {
  total_views: number;
  avg_ctr: number;
  avg_watch_pct: number;
  clip_count: number;
}

export interface ViewsRow {
  date: string;
  youtube: number;
  bluesky: number;
  linkedin: number;
  threads: number;
}

export interface CtrRow {
  platform: string;
  ctr: number;
}

export interface WatchBucket {
  bucket: string;
  count: number;
}

export interface ScatterPoint {
  clip_id: string;
  hook: string;
  score: number;
  ctr: number;
  views: number;
}

export interface TopClip {
  rank: number;
  hook: string;
  episode: string;
  platform: string;
  views: number;
  ctr: number;
  watchPct: number;
  score: number;
}

export interface ShowStats {
  show: string;
  total_views: number;
  avg_ctr: number;
  avg_watch_pct: number;
  clip_count: number;
}

export const analyticsApi = {
  overview: (range?: DateRange) => getAnalytics<OverviewData>("/overview", range),
  views: (range?: DateRange) => getAnalytics<ViewsRow[]>("/views", range),
  ctr: (range?: DateRange) => getAnalytics<CtrRow[]>("/ctr", range),
  watchDistribution: (range?: DateRange) => getAnalytics<WatchBucket[]>("/watch-distribution", range),
  scoreVsPerformance: (range?: DateRange) => getAnalytics<ScatterPoint[]>("/score-vs-performance", range),
  topClips: (range?: DateRange, limit?: number) =>
    getAnalytics<TopClip[]>(`/top-clips${limit ? `?limit=${limit}` : ""}`, range),
  byShow: (range?: DateRange) => getAnalytics<ShowStats[]>("/by-show", range),
};
