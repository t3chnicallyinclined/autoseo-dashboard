import { useState, useEffect } from "react"
import { Briefcase, Film, Send, Eye, MousePointer, DollarSign, TrendingUp, TrendingDown, ArrowRight, RefreshCw, Play, CircleCheck as CheckCircle2, Clock, Loader as Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart, Line, ResponsiveContainer,
} from "recharts"
import {
  useClips, usePlatforms, useTrends, useAgents, useAnalytics, useJobs, usePipelineStages, useCostData,
} from "@/api/hooks"
import { toast } from "sonner"
import type { Platform, Agent, PipelineStage } from "@/api/types"

function StatCard({ title, value, delta, deltaLabel, icon: Icon, color, sparkData }: {
  title: string
  value: string
  delta?: string
  deltaLabel?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  sparkData?: { v: number }[]
}) {
  const [displayed, setDisplayed] = useState(0)
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""))

  useEffect(() => {
    if (isNaN(numericValue)) return
    let start = 0
    const end = numericValue
    const duration = 1200
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setDisplayed(end); clearInterval(timer) }
      else setDisplayed(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [numericValue])

  const displayVal = isNaN(numericValue) ? value :
    value.includes("$") ? `$${displayed.toLocaleString()}` :
    value.includes("%") ? `${displayed}%` :
    displayed.toLocaleString()

  const isPositive = delta?.startsWith("+")
  const isNegative = delta?.startsWith("-")

  return (
    <Card className="relative overflow-hidden bg-card border-border card-top-border flex-1 min-w-[160px]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`size-9 rounded-lg flex items-center justify-center`} style={{ background: `${color}20` }}>
            <Icon className="size-4" style={{ color }} />
          </div>
          {sparkData && (
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono">{displayVal}</p>
          {delta && (
            <div className={`flex items-center gap-1 text-xs ${isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-muted-foreground"}`}>
              {isPositive && <TrendingUp className="size-3" />}
              {isNegative && <TrendingDown className="size-3" />}
              <span>{delta} {deltaLabel}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const sparkJobs = [{ v: 3 }, { v: 5 }, { v: 2 }, { v: 7 }, { v: 4 }, { v: 8 }, { v: 2 }]
const sparkViews = [{ v: 12000 }, { v: 48000 }, { v: 89000 }, { v: 124000 }, { v: 98000 }, { v: 145000 }, { v: 182000 }]
const sparkCtr = [{ v: 11 }, { v: 13 }, { v: 12 }, { v: 15 }, { v: 14 }, { v: 16 }, { v: 15 }]

function PipelineStageChip({ stage, isActive }: { stage: PipelineStage, isActive: boolean }) {
  const colors = {
    done: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
    active: { bg: "bg-primary/20", text: "text-primary", border: "border-primary/50" },
    idle: { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border" },
    failed: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  }
  const status = isActive ? "active" : (stage.status as "done" | "idle" | "failed")
  const c = colors[status] || colors.idle

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${c.bg} ${c.text} ${c.border} ${status === "active" ? "pipeline-active" : ""}`}>
      {status === "done" && <CheckCircle2 className="size-3" />}
      {status === "active" && <Loader2 className="size-3 animate-spin" />}
      {status === "idle" && <Clock className="size-3 opacity-50" />}
      <div>
        <div>{stage.label}</div>
        <div className="text-xs opacity-60">{stage.sublabel}</div>
      </div>
    </div>
  )
}

function PlatformStatusRow({ platform }: { platform: Platform }) {
  const statusColors = {
    connected: "bg-emerald-500",
    pending: "bg-amber-500",
    expired: "bg-amber-500",
    not_configured: "bg-muted-foreground",
  }
  const statusLabels = {
    connected: "Connected",
    pending: "Pending",
    expired: "Expired",
    not_configured: "Not set up",
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div
        className="size-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: platform.color + "33", border: `1px solid ${platform.color}44` }}
      >
        <span style={{ color: platform.color }}>{platform.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{platform.name}</span>
          <span className={`size-1.5 rounded-full shrink-0 ${statusColors[platform.status as keyof typeof statusColors] ?? "bg-muted-foreground"}`} />
        </div>
        <span className="text-xs text-muted-foreground">{statusLabels[platform.status as keyof typeof statusLabels]}</span>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">{platform.lastPost}</div>
        {platform.quotaUsed !== undefined && (
          <div className="w-16 mt-1">
            <Progress value={(platform.quotaUsed / platform.quotaTotal!) * 100} className="h-1" />
            <div className="text-xs text-muted-foreground/60 mt-0.5">{platform.quotaUsed}/{platform.quotaTotal}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-accent/30 border border-border hover:bg-accent/50 transition-colors">
      <div className="relative">
        <div
          className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: `${agent.color}33`, border: `2px solid ${agent.color}66` }}
        >
          <span style={{ color: agent.color }}>{agent.name[0]}</span>
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${agent.status === "working" ? "bg-emerald-500 status-pulse" : agent.status === "error" ? "bg-red-500" : "bg-muted-foreground"}`}
        />
      </div>
      <span className="text-xs font-semibold text-foreground">{agent.name}</span>
      <span className={`text-xs ${agent.status === "working" ? "text-emerald-400" : "text-muted-foreground"}`}>
        {agent.status === "working" ? agent.elapsed : "Idle"}
      </span>
    </div>
  )
}

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { data: clips = [], isLoading: clipsLoading } = useClips()
  const { data: platforms = [] } = usePlatforms()
  const { data: trendingTopics } = useTrends()
  const { data: agents = [] } = useAgents()
  const { data: analyticsData } = useAnalytics()
  const { data: jobs = [] } = useJobs()
  const { data: pipelineStages = [] } = usePipelineStages()
  const { data: costData, error } = useCostData()

  if (error) toast.error("Failed to load dashboard data")

  if (clipsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 min-w-[160px] flex-1 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const activeJobs = jobs.filter(j => ["transcribing", "rendering", "ranking"].includes(j.status))
  const recentClips = clips.slice(0, 8)
  const totalViews = analyticsData?.views.reduce((s, d) => s + d.youtube + d.bluesky + d.linkedin + d.threads, 0) ?? 0

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="flex gap-4 overflow-x-auto pb-1">
        <StatCard title="Active Jobs" value="2" icon={Briefcase} color="#3b82f6" sparkData={sparkJobs} />
        <StatCard title="Clips This Week" value="108" delta="+23" deltaLabel="vs last week" icon={Film} color="#8b5cf6" />
        <StatCard title="Posts Published" value="47" delta="+12" deltaLabel="this week" icon={Send} color="#22c55e" />
        <StatCard title="Total Views" value={totalViews.toString()} delta="+34%" deltaLabel="vs last week" icon={Eye} color="#3b82f6" sparkData={sparkViews} />
        <StatCard title="Avg CTR" value="12.4%" delta="+1.2%" deltaLabel="vs last week" icon={MousePointer} color="#f59e0b" sparkData={sparkCtr} />
        <StatCard title="API Spend" value={`$${costData?.total ?? 0}`} delta={`$${costData?.dailyBurn ?? 0}/day`} icon={DollarSign} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Live Pipeline */}
          <Card className="bg-card border-border card-top-border relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Live Pipeline</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 status-pulse" />
                  <span className="text-xs text-emerald-400">2 jobs in flight</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Pipeline stages */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {pipelineStages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-1 shrink-0">
                    <PipelineStageChip stage={stage} isActive={stage.status === "active"} />
                    {i < pipelineStages.length - 1 && (
                      <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Active jobs */}
              {activeJobs.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {activeJobs.map(job => (
                    <div key={job.id} className="rounded-lg bg-accent/40 border border-border p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{job.media}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Loader2 className="size-3 animate-spin text-primary" />
                          <span className="text-xs text-primary font-mono">{job.status}</span>
                        </div>
                      </div>
                      <Progress value={job.progress} className="h-1" />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{job.stage}</span>
                        <span className="text-xs font-mono text-muted-foreground">{job.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">No active jobs</div>
              )}
            </CardContent>
          </Card>

          {/* Recent Clips */}
          <Card className="bg-card border-border card-top-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Clips</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate("clips")} className="text-xs text-muted-foreground h-7">
                  View all <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recentClips.map(clip => (
                  <div
                    key={clip.id}
                    className="shrink-0 w-36 cursor-pointer group"
                  >
                    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video mb-1.5">
                      <img src={clip.thumbnail} alt={clip.hook} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="size-6 text-white" fill="white" />
                      </div>
                      <div className={`absolute top-1 left-1 size-5 rounded text-xs font-bold flex items-center justify-center ${clip.rank === 1 ? "bg-yellow-500 text-black" : clip.rank === 2 ? "bg-gray-400 text-black" : clip.rank === 3 ? "bg-amber-700 text-white" : "bg-black/60 text-white"}`}>
                        #{clip.rank}
                      </div>
                      <span className="absolute bottom-1 right-1 text-xs font-mono bg-black/70 text-white px-1 rounded">{clip.duration}</span>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-tight line-clamp-2">{clip.hook}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {Object.entries(clip.platforms).slice(0, 4).map(([p, status]) => (
                        <div
                          key={p}
                          className={`size-3 rounded-full text-xs flex items-center justify-center ${status === "posted" ? "bg-emerald-500/20 border border-emerald-500/40" : status === "failed" ? "bg-red-500/20 border border-red-500/40" : "bg-muted border border-border"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Platform Health */}
          <Card className="bg-card border-border card-top-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Platform Health</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate("platforms")} className="text-xs text-muted-foreground h-7">
                  Manage <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {platforms.map(p => <PlatformStatusRow key={p.id} platform={p} />)}
            </CardContent>
          </Card>

          {/* Trending Context */}
          <Card className="bg-card border-border card-top-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Trending Context</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="size-3" />
                  <span>14m ago</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="gdelt">
                <TabsList className="h-7 mb-3">
                  <TabsTrigger value="gdelt" className="text-xs h-6">GDELT</TabsTrigger>
                  <TabsTrigger value="reddit" className="text-xs h-6">Reddit</TabsTrigger>
                  <TabsTrigger value="google" className="text-xs h-6">Google</TabsTrigger>
                </TabsList>
                <TabsContent value="gdelt" className="space-y-1.5 mt-0">
                  {(trendingTopics?.gdelt ?? []).map(t => (
                    <div key={t.topic} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground truncate">{t.topic}</span>
                          {t.matched > 0 && (
                            <Badge className="h-3.5 text-[9px] px-1 bg-primary/20 text-primary border-0">+{t.matched}</Badge>
                          )}
                        </div>
                        <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${t.score * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{t.score.toFixed(2)}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="reddit" className="space-y-1.5 mt-0">
                  {(trendingTopics?.reddit ?? []).map(t => (
                    <div key={t.title} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate leading-snug">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{t.subreddit}</Badge>
                          <span className="text-xs text-muted-foreground">{(t.score / 1000).toFixed(1)}k</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="google" className="space-y-1.5 mt-0">
                  {(trendingTopics?.google ?? []).map(t => (
                    <div key={t.term} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{t.term}</p>
                        <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${(t.volume / 1300000) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{(t.volume / 1000).toFixed(0)}k</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Agent Status */}
          <Card className="bg-card border-border card-top-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Agent Status</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate("agents")} className="text-xs text-muted-foreground h-7">
                  Details <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1">
                {agents.filter(a => a.status === "working").map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span style={{ color: a.color }} className="font-semibold shrink-0">{a.name}</span>
                    <span className="text-muted-foreground truncate">{a.currentTask}</span>
                    <span className="font-mono text-muted-foreground/60 shrink-0">{a.elapsed}</span>
                  </div>
                ))}
                {agents.filter(a => a.status === "idle").map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span style={{ color: a.color }} className="font-semibold shrink-0">{a.name}</span>
                    <span className="text-muted-foreground/50">idle</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
