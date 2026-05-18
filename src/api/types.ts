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

export interface Clip {
  id: string
  episodeId: string
  rank: number
  hook: string
  duration: string
  llmScore: number
  vlmScore: number
  status: string
  thumbnail: string
  platforms: Record<string, string>
  views: number
  ctr: number
  watchPct: number
}

export interface Job {
  id: string
  episodeId: string | null
  showId: string
  media: string
  status: string
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

export interface Platform {
  id: string
  name: string
  icon: string
  status: string
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

export interface TrendingTopics {
  gdelt: { topic: string; score: number; sources: number; tone: number; matched: number }[]
  reddit: { title: string; subreddit: string; score: number; comments: number }[]
  google: { term: string; volume: number; related: string[] }[]
}

export interface Agent {
  id: string
  name: string
  role: string
  color: string
  status: string
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

export interface AnalyticsData {
  views: { date: string; youtube: number; bluesky: number; linkedin: number; threads: number }[]
  topClips: {
    rank: number; hook: string; episode: string; platform: string
    views: number; ctr: number; watchPct: number; score: number
  }[]
}

export interface PipelineStage {
  id: string
  label: string
  sublabel: string
  status: string
}
