import { useState } from "react"
import { TrendingUp, TrendingDown, Eye, MousePointer, Clock, Heart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DateRange } from "@/lib/api"
import {
  useOverview, useViews, useCtr, useWatchDistribution,
  useScoreVsPerformance, useTopClips,
} from "@/hooks/useAnalytics"

const platformColors: Record<string, string> = {
  youtube: "#ef4444",
  bluesky: "#0085ff",
  linkedin: "#0077b5",
  threads: "#aaaaaa",
}

const viewsConfig = {
  youtube: { label: "YouTube", color: "var(--chart-5)" },
  bluesky: { label: "Bluesky", color: "#0085ff" },
  linkedin: { label: "LinkedIn", color: "#0077b5" },
  threads: { label: "Threads", color: "#aaa" },
}

const ranges: { label: string; value: DateRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
]

export default function Analytics() {
  const [range, setRange] = useState<DateRange>("7d")

  const overview = useOverview(range)
  const views = useViews(range)
  const ctr = useCtr(range)
  const watchDist = useWatchDistribution(range)
  const scatter = useScoreVsPerformance(range)
  const topClips = useTopClips(range, 10)

  const totalViews = overview.data?.total_views ?? 0
  const avgCtr = overview.data?.avg_ctr ?? 0
  const avgWatch = overview.data?.avg_watch_pct ?? 0

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Performance Overview</h2>
        <div className="flex gap-1.5">
          {ranges.map((r) => (
            <Button
              key={r.label}
              variant={range === r.value ? "default" : "outline"}
              size="sm"
              className={`h-7 text-xs ${range === r.value ? "bg-primary hover:bg-primary/90" : "border-border text-muted-foreground"}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Views", value: totalViews > 0 ? `${(totalViews / 1000).toFixed(0)}k` : "—", icon: Eye, color: "#3b82f6" },
          { label: "Avg CTR", value: avgCtr > 0 ? `${avgCtr}%` : "—", icon: MousePointer, color: "#f59e0b" },
          { label: "Avg Watch %", value: avgWatch > 0 ? `${Math.round(avgWatch)}%` : "—", icon: Clock, color: "#22c55e" },
          { label: "Clips Tracked", value: overview.data?.clip_count?.toString() ?? "—", icon: Heart, color: "#8b5cf6" },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-card border-border card-top-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="size-3.5" style={{ color: kpi.color }} />
              </div>
              <p className="text-xl font-bold text-foreground font-mono">{overview.loading ? "…" : kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Views over time */}
        <Card className="lg:col-span-2 bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {views.loading ? (
              <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
            ) : (
              <ChartContainer config={viewsConfig} className="h-52 w-full">
                <AreaChart data={views.data ?? []}>
                  <defs>
                    {Object.entries(platformColors).map(([p, c]) => (
                      <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="youtube" stroke="#ef4444" fill="url(#grad-youtube)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="bluesky" stroke="#0085ff" fill="url(#grad-bluesky)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="linkedin" stroke="#0077b5" fill="url(#grad-linkedin)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="threads" stroke="#aaa" fill="url(#grad-threads)" strokeWidth={1.5} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* CTR by Platform */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">CTR by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {ctr.loading ? (
              <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
            ) : (
              <ChartContainer config={{}} className="h-52 w-full">
                <BarChart data={ctr.data ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="platform" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v) => [`${v}%`, ""]} />
                  <Bar dataKey="ctr" fill="#3b82f6" radius={3} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score vs CTR scatter */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">AI Score vs Actual CTR</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Does the ranker predict viral clips?</p>
          </CardHeader>
          <CardContent>
            {scatter.loading ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
            ) : (
              <ChartContainer config={{}} className="h-48 w-full">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="score" name="LLM Score" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} label={{ value: "LLM Score", position: "insideBottom", offset: -5, fontSize: 10, fill: "#64748b" }} />
                  <YAxis dataKey="ctr" name="CTR %" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v, n) => [n === "ctr" ? `${v}%` : v, n === "ctr" ? "CTR" : "Score"]} />
                  <ReferenceLine stroke="#334155" strokeDasharray="3 3" />
                  <Scatter data={scatter.data ?? []} fill="#3b82f6" opacity={0.8} />
                </ScatterChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Watch % distribution */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Watch % Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {watchDist.loading ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
            ) : (
              <ChartContainer config={{}} className="h-48 w-full">
                <BarChart data={watchDist.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top performing clips table */}
      <Card className="bg-card border-border card-top-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Top Performing Clips</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground pl-4">#</TableHead>
                <TableHead className="text-xs text-muted-foreground">Hook</TableHead>
                <TableHead className="text-xs text-muted-foreground">Episode</TableHead>
                <TableHead className="text-xs text-muted-foreground">Platform</TableHead>
                <TableHead className="text-xs text-muted-foreground">Views</TableHead>
                <TableHead className="text-xs text-muted-foreground">CTR</TableHead>
                <TableHead className="text-xs text-muted-foreground">Watch %</TableHead>
                <TableHead className="text-xs text-muted-foreground pr-4">AI Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClips.loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : (topClips.data ?? []).map(clip => (
                <TableRow key={clip.rank} className="border-border hover:bg-accent/20">
                  <TableCell className="pl-4">
                    <span className={`size-5 rounded text-xs font-bold flex items-center justify-center ${clip.rank === 1 ? "bg-yellow-500 text-black" : clip.rank === 2 ? "bg-gray-400 text-black" : clip.rank === 3 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
                      {clip.rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium text-foreground max-w-[220px] truncate">{clip.hook}</p>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{clip.episode}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{clip.platform}</span></TableCell>
                  <TableCell><span className="text-xs font-mono text-foreground">{(clip.views / 1000).toFixed(0)}k</span></TableCell>
                  <TableCell><span className="text-xs font-mono text-amber-400">{clip.ctr}%</span></TableCell>
                  <TableCell><span className="text-xs font-mono text-emerald-400">{clip.watchPct}%</span></TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${clip.score}%` }} />
                      </div>
                      <span className="text-xs font-mono text-primary">{clip.score}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
