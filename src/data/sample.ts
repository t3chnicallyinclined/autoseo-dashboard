export const shows = [
  { id: "1", name: "The Joe Rogan Experience", slug: "jre", episodes: 5, clips: 45, color: "#ef4444", hosts: ["Joe Rogan"] },
  { id: "2", name: "Lex Fridman Podcast", slug: "lex", episodes: 3, clips: 28, color: "#3b82f6", hosts: ["Lex Fridman"] },
  { id: "3", name: "All-In Podcast", slug: "allin", episodes: 4, clips: 35, color: "#f59e0b", hosts: ["Chamath", "Jason", "Sacks", "Friedberg"] },
]

export const episodes = [
  { id: "ep1", showId: "1", title: "JRE #2247 — Elon Musk", date: "2026-05-10", clips: 12, duration: "3h 22m" },
  { id: "ep2", showId: "1", title: "JRE #2246 — Sam Altman", date: "2026-05-05", clips: 9, duration: "2h 48m" },
  { id: "ep3", showId: "2", title: "Lex #450 — Andrej Karpathy", date: "2026-05-08", clips: 11, duration: "4h 10m" },
  { id: "ep4", showId: "3", title: "All-In E185 — Q2 Recap", date: "2026-05-12", clips: 8, duration: "1h 55m" },
]

export const clips = [
  {
    id: "c1", episodeId: "ep1", rank: 1,
    hook: "This changes everything about AI regulation",
    duration: "0:58", llmScore: 94, vlmScore: 88,
    status: "posted",
    thumbnail: "https://picsum.photos/seed/clip1/320/180",
    platforms: { youtube: "posted", bluesky: "posted", tiktok: "pending", instagram: "skipped", linkedin: "failed", threads: "posted" },
    views: 248000, ctr: 16.2, watchPct: 78,
  },
  {
    id: "c2", episodeId: "ep1", rank: 2,
    hook: "I've never told anyone this before",
    duration: "1:12", llmScore: 89, vlmScore: 92,
    status: "posted",
    thumbnail: "https://picsum.photos/seed/clip2/320/180",
    platforms: { youtube: "posted", bluesky: "posted", tiktok: "pending", instagram: "skipped", linkedin: "skipped", threads: "posted" },
    views: 182000, ctr: 14.8, watchPct: 85,
  },
  {
    id: "c3", episodeId: "ep1", rank: 3,
    hook: "The real reason I left the company",
    duration: "0:47", llmScore: 85, vlmScore: 79,
    status: "posted",
    thumbnail: "https://picsum.photos/seed/clip3/320/180",
    platforms: { youtube: "posted", bluesky: "failed", tiktok: "pending", instagram: "skipped", linkedin: "skipped", threads: "skipped" },
    views: 94000, ctr: 11.3, watchPct: 72,
  },
  {
    id: "c4", episodeId: "ep1", rank: 4,
    hook: "People don't understand what's coming next",
    duration: "1:33", llmScore: 82, vlmScore: 75,
    status: "approved",
    thumbnail: "https://picsum.photos/seed/clip4/320/180",
    platforms: { youtube: "pending", bluesky: "pending", tiktok: "pending", instagram: "skipped", linkedin: "skipped", threads: "pending" },
    views: 0, ctr: 0, watchPct: 0,
  },
  {
    id: "c5", episodeId: "ep2", rank: 1,
    hook: "GPT-5 is already deployed internally",
    duration: "0:52", llmScore: 91, vlmScore: 86,
    status: "posted",
    thumbnail: "https://picsum.photos/seed/clip5/320/180",
    platforms: { youtube: "posted", bluesky: "posted", tiktok: "pending", instagram: "skipped", linkedin: "posted", threads: "posted" },
    views: 156000, ctr: 13.5, watchPct: 82,
  },
  {
    id: "c6", episodeId: "ep3", rank: 1,
    hook: "Backpropagation explained in 60 seconds",
    duration: "1:00", llmScore: 88, vlmScore: 83,
    status: "posted",
    thumbnail: "https://picsum.photos/seed/clip6/320/180",
    platforms: { youtube: "posted", bluesky: "posted", tiktok: "pending", instagram: "skipped", linkedin: "posted", threads: "skipped" },
    views: 72000, ctr: 8.9, watchPct: 91,
  },
  {
    id: "c7", episodeId: "ep4", rank: 1,
    hook: "The Fed is about to make a historic mistake",
    duration: "1:18", llmScore: 87, vlmScore: 80,
    status: "generated",
    thumbnail: "https://picsum.photos/seed/clip7/320/180",
    platforms: { youtube: "pending", bluesky: "pending", tiktok: "pending", instagram: "skipped", linkedin: "pending", threads: "pending" },
    views: 0, ctr: 0, watchPct: 0,
  },
  {
    id: "c8", episodeId: "ep1", rank: 5,
    hook: "Why every startup is doing this wrong",
    duration: "0:44", llmScore: 78, vlmScore: 71,
    status: "vetoed",
    thumbnail: "https://picsum.photos/seed/clip8/320/180",
    platforms: {},
    views: 0, ctr: 0, watchPct: 0,
  },
]

export const jobs = [
  {
    id: "job-001", episodeId: "ep1", showId: "1",
    media: "JRE_2247_Elon_Musk_4K.mp4",
    status: "done", stage: "complete", progress: 100,
    clipsGenerated: 12, postsSuccess: 8, postsTotal: 10,
    cost: 2.84, duration: "14m 22s", created: "2026-05-10T09:15:00Z",
  },
  {
    id: "job-002", episodeId: "ep2", showId: "1",
    media: "JRE_2246_Sam_Altman.mp4",
    status: "done", stage: "complete", progress: 100,
    clipsGenerated: 9, postsSuccess: 7, postsTotal: 9,
    cost: 2.21, duration: "11m 48s", created: "2026-05-05T14:30:00Z",
  },
  {
    id: "job-003", episodeId: "ep3", showId: "2",
    media: "Lex_450_Karpathy.mp4",
    status: "rendering", stage: "render", progress: 72,
    clipsGenerated: 11, postsSuccess: 0, postsTotal: 0,
    cost: 1.95, duration: "18m 05s", created: "2026-05-08T11:00:00Z",
  },
  {
    id: "job-004", episodeId: "ep4", showId: "3",
    media: "AllIn_E185_Q2_Recap.mp4",
    status: "transcribing", stage: "transcribe", progress: 45,
    clipsGenerated: 0, postsSuccess: 0, postsTotal: 0,
    cost: 0.68, duration: "6m 12s", created: "2026-05-12T08:45:00Z",
  },
  {
    id: "job-005", episodeId: null, showId: "1",
    media: "JRE_2248_Bernie_Sanders.mp4",
    status: "failed", stage: "transcribe", progress: 23,
    clipsGenerated: 0, postsSuccess: 0, postsTotal: 0,
    cost: 0.34, duration: "4m 18s", created: "2026-05-14T16:20:00Z",
    error: "Whisper API timeout after 3 retries. Rate limit exceeded.",
  },
]

export const platforms = [
  {
    id: "youtube", name: "YouTube Shorts", icon: "YT",
    status: "connected", handle: "@JREClips", color: "#ef4444",
    totalPosts: 34, totalViews: 1240000, avgCtr: 12.4, avgWatch: 74,
    quotaUsed: 3200, quotaTotal: 10000,
    lastPost: "2h ago",
  },
  {
    id: "bluesky", name: "Bluesky", icon: "BS",
    status: "connected", handle: "@jreclips.bsky.social", color: "#0085ff",
    totalPosts: 28, totalViews: 89000, avgCtr: 6.8, avgWatch: 62,
    lastPost: "2h ago",
  },
  {
    id: "tiktok", name: "TikTok", icon: "TT",
    status: "pending", handle: "@JREClipsOfficial", color: "#ff0050",
    totalPosts: 0, totalViews: 0, avgCtr: 0, avgWatch: 0,
    lastPost: "Never",
    note: "App review pending",
  },
  {
    id: "instagram", name: "Instagram Reels", icon: "IG",
    status: "not_configured", handle: null, color: "#e1306c",
    totalPosts: 0, totalViews: 0, avgCtr: 0, avgWatch: 0,
    lastPost: "Never",
  },
  {
    id: "linkedin", name: "LinkedIn", icon: "LI",
    status: "expired", handle: "JRE Official", color: "#0077b5",
    totalPosts: 12, totalViews: 24000, avgCtr: 3.2, avgWatch: 45,
    lastPost: "5d ago",
    note: "Token expired — reconnect",
  },
  {
    id: "threads", name: "Threads", icon: "TH",
    status: "connected", handle: "@jreclips", color: "#101010",
    totalPosts: 22, totalViews: 45000, avgCtr: 4.1, avgWatch: 55,
    lastPost: "3h ago",
  },
]

export const trendingTopics = {
  gdelt: [
    { topic: "AI Regulation", score: 0.94, sources: 2840, tone: -0.2, matched: 3 },
    { topic: "SpaceX Starship", score: 0.88, sources: 1920, tone: 0.6, matched: 2 },
    { topic: "Federal Reserve Rates", score: 0.82, sources: 3100, tone: -0.4, matched: 1 },
    { topic: "OpenAI GPT-5", score: 0.79, sources: 1650, tone: 0.3, matched: 4 },
    { topic: "Crypto Bitcoin ETF", score: 0.71, sources: 980, tone: 0.5, matched: 0 },
  ],
  reddit: [
    { title: "OpenAI drops GPT-5 with 10x context", subreddit: "r/MachineLearning", score: 48200, comments: 3820 },
    { title: "SpaceX Starship reaches orbit", subreddit: "r/space", score: 142000, comments: 8400 },
    { title: "Federal Reserve emergency meeting", subreddit: "r/Economics", score: 31000, comments: 4200 },
    { title: "Elon Musk interview goes viral", subreddit: "r/videos", score: 89000, comments: 12000 },
    { title: "UFC 320 results thread", subreddit: "r/MMA", score: 24000, comments: 6800 },
  ],
  google: [
    { term: "AI regulation 2026", volume: 890000, related: ["EU AI Act", "Sam Altman", "Congress"] },
    { term: "Starship launch today", volume: 1200000, related: ["SpaceX", "Elon Musk", "orbit"] },
    { term: "Fed rate decision", volume: 740000, related: ["Powell", "inflation", "FOMC"] },
    { term: "JRE Elon Musk full episode", volume: 560000, related: ["Joe Rogan", "podcast", "YouTube"] },
    { term: "UFC 320", volume: 480000, related: ["MMA", "championship", "results"] },
  ],
}

export const agents = [
  {
    id: "atlas", name: "Atlas", role: "Orchestrator & Content Intelligence", color: "#3b82f6",
    status: "working", currentTask: "Ranking 11 candidates from Lex #450", elapsed: "2m 34s",
    skills: ["Whisper STT", "GPT-4o", "Feature Extraction", "Ranking"],
    tasksCompleted: 1247, avgDuration: "8m 12s", successRate: 98.2,
  },
  {
    id: "render", name: "Render", role: "Video Rendering & Caption Overlay", color: "#22c55e",
    status: "working", currentTask: "Rendering 9:16 variant for clip c6", elapsed: "45s",
    skills: ["ffmpeg", "Caption Burn", "Scene Detection", "Format Conversion"],
    tasksCompleted: 892, avgDuration: "3m 45s", successRate: 99.1,
  },
  {
    id: "platform", name: "Platform", role: "Multi-Platform Distribution", color: "#8b5cf6",
    status: "idle", currentTask: null, elapsed: null,
    skills: ["YouTube API", "Bluesky API", "LinkedIn API", "Ayrshare"],
    tasksCompleted: 634, avgDuration: "1m 22s", successRate: 96.8,
  },
  {
    id: "sentinel", name: "Sentinel", role: "Monitoring & Cost Tracking", color: "#f59e0b",
    status: "idle", currentTask: null, elapsed: null,
    skills: ["Health Checks", "Cost Alerts", "Error Recovery", "GDELT"],
    tasksCompleted: 2891, avgDuration: "0m 05s", successRate: 99.9,
  },
]

export const costData = {
  total: 12.47,
  breakdown: { stt: 4.20, chat: 5.80, embeddings: 0.95, vlm: 1.52 },
  budget: 50.00,
  dailyBurn: 0.89,
}

export const analyticsData = {
  views: [
    { date: "May 9", youtube: 12000, bluesky: 2400, linkedin: 800, threads: 1200 },
    { date: "May 10", youtube: 48000, bluesky: 8200, linkedin: 2100, threads: 4800 },
    { date: "May 11", youtube: 89000, bluesky: 12000, linkedin: 3400, threads: 7200 },
    { date: "May 12", youtube: 124000, bluesky: 18000, linkedin: 4200, threads: 9800 },
    { date: "May 13", youtube: 98000, bluesky: 14500, linkedin: 3800, threads: 8100 },
    { date: "May 14", youtube: 145000, bluesky: 22000, linkedin: 5100, threads: 11200 },
    { date: "May 15", youtube: 182000, bluesky: 28000, linkedin: 6800, threads: 14500 },
  ],
  topClips: [
    { rank: 1, hook: "This changes everything about AI regulation", episode: "JRE #2247", platform: "YouTube", views: 248000, ctr: 16.2, watchPct: 78, score: 94 },
    { rank: 2, hook: "I've never told anyone this before", episode: "JRE #2247", platform: "YouTube", views: 182000, ctr: 14.8, watchPct: 85, score: 89 },
    { rank: 3, hook: "GPT-5 is already deployed internally", episode: "JRE #2246", platform: "YouTube", views: 156000, ctr: 13.5, watchPct: 82, score: 91 },
    { rank: 4, hook: "The real reason I left the company", episode: "JRE #2247", platform: "YouTube", views: 94000, ctr: 11.3, watchPct: 72, score: 85 },
    { rank: 5, hook: "Backpropagation explained in 60 seconds", episode: "Lex #450", platform: "YouTube", views: 72000, ctr: 8.9, watchPct: 91, score: 88 },
  ],
}

export const pipelineStages = [
  { id: "ingest", label: "Ingest", sublabel: "Gmail/Drive", status: "done" },
  { id: "download", label: "Download", sublabel: "Drive API", status: "done" },
  { id: "audio", label: "Audio Extract", sublabel: "ffmpeg", status: "done" },
  { id: "transcribe", label: "Transcribe", sublabel: "Whisper", status: "active" },
  { id: "features", label: "Feature Extract", sublabel: "VAD/Prosody/Embed", status: "idle" },
  { id: "rank", label: "Rank", sublabel: "GPT-4o", status: "idle" },
  { id: "render", label: "Render", sublabel: "ffmpeg", status: "idle" },
  { id: "post", label: "Post", sublabel: "Platforms", status: "idle" },
]
