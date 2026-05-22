export interface Show {
  id: string
  name: string
  slug: string
  episodes: number
  clips: number
  color: string
  hosts: string[]
}

export interface Episode {
  id: string
  showId: string
  title: string
  date: string
  clips: number
  duration: string
}

export type ClipStatus = "posted" | "approved" | "generated" | "vetoed"
export type PlatformPostStatus = "posted" | "pending" | "failed" | "skipped"

export interface ClipVariant {
  variant: string  // "9x16" | "1x1" | "16x9" | other
  url: string | null
  bytes?: number | null
  duration_ms?: number | null
}

/** Social-media copy keyed by platform — shape varies per platform.
 *  We treat fields as optional strings/arrays so the UI can probe gracefully. */
export interface ClipSocialEntry {
  title?: string
  description?: string
  caption?: string
  text?: string
  post_text?: string
  hashtags?: string[]
  tags?: string[]
  pinned_comment?: string
}

export interface ClipSocial {
  overlay_hook?: string
  hook_source?: string
  youtube_shorts?: ClipSocialEntry
  tiktok?: ClipSocialEntry
  instagram_reels?: ClipSocialEntry
  threads?: ClipSocialEntry
  linkedin?: ClipSocialEntry
  x?: ClipSocialEntry
  bluesky?: ClipSocialEntry
}

export interface Clip {
  id: string
  episodeId: string
  rank: number
  hook: string
  duration: string
  llmScore: number
  vlmScore: number
  status: ClipStatus
  thumbnail: string
  platforms: Record<string, PlatformPostStatus>
  views: number
  ctr: number
  watchPct: number
  /** All rendered aspect-ratio variants (from clip_renders + manifest). */
  variants?: ClipVariant[]
  /** Per-platform social-media copy (from manifest.json, when present). */
  social?: ClipSocial | null
  /** 2–5 word overlay text burned into the first ~1.5s of the clip. */
  overlayHook?: string | null
  /** Source of the hook: "llm" | "ranker" — for surfacing provenance. */
  hookSource?: string | null
  /** Reasoning behind the ranker's choice of this clip. */
  reasoning?: string | null
}

export type JobStatus = "done" | "transcribing" | "rendering" | "failed" | "pending"

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

export type PlatformConnectionStatus = "connected" | "pending" | "expired" | "not_configured"

export interface Platform {
  id: string
  name: string
  icon: string
  status: PlatformConnectionStatus
  handle: string | null
  color: string
  totalPosts: number
  totalViews: number
  avgCtr: number
  avgWatch: number
  quotaUsed?: number
  quotaTotal?: number
  lastPost: string
  note?: string
}

export interface GdeltTrend {
  topic: string
  score: number
  sources: number
  tone: number
  matched: number
}

export interface RedditTrend {
  title: string
  subreddit: string
  score: number
  comments: number
}

export interface GoogleTrend {
  term: string
  volume: number
  related: string[]
}

export interface TrendingTopics {
  gdelt: GdeltTrend[]
  reddit: RedditTrend[]
  google: GoogleTrend[]
}

export type AgentStatus = "working" | "idle" | "error"

export interface Agent {
  id: string
  name: string
  role: string
  color: string
  status: AgentStatus
  currentTask: string | null
  elapsed: string | null
  skills: string[]
  tasksCompleted: number
  avgDuration: string
  successRate: number
}

export interface CostData {
  total: number
  breakdown: { stt: number; chat: number; embeddings: number; vlm: number }
  budget: number
  dailyBurn: number
}

export interface ViewDataPoint {
  date: string
  youtube: number
  bluesky: number
  linkedin: number
  threads: number
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

export interface AnalyticsData {
  views: ViewDataPoint[]
  topClips: TopClip[]
}

export type PipelineStageStatus = "done" | "active" | "idle" | "error"

export interface PipelineStage {
  id: string
  label: string
  sublabel: string
  status: PipelineStageStatus
}

export interface ClipFilters {
  status?: ClipStatus
  episodeId?: string
  search?: string
}

export interface JobFilters {
  status?: JobStatus
  showId?: string
}

export interface DateRange {
  from?: string
  to?: string
}
