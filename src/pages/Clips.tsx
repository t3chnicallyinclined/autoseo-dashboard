import { useState } from "react"
import { Play, MoveVertical as MoreVertical, Eye, Check, Ban, Download, Search, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { clips, episodes } from "@/data/sample"

const platformIcons: Record<string, { short: string; color: string }> = {
  youtube: { short: "YT", color: "#ef4444" },
  bluesky: { short: "BS", color: "#0085ff" },
  tiktok: { short: "TT", color: "#ff0050" },
  instagram: { short: "IG", color: "#e1306c" },
  linkedin: { short: "LI", color: "#0077b5" },
  threads: { short: "TH", color: "#888" },
}


function ClipCard({ clip, onClick }: { clip: typeof clips[0]; onClick: () => void }) {
  const episode = episodes.find(e => e.id === clip.episodeId)
  const rankStyle = clip.rank === 1
    ? "bg-yellow-500 text-black"
    : clip.rank === 2
      ? "bg-gray-300 text-black"
      : clip.rank === 3
        ? "bg-amber-700 text-white"
        : "bg-black/60 text-white"

  return (
    <Card className="bg-card border-border overflow-hidden hover:border-primary/30 hover:glow-blue transition-all cursor-pointer group">
      <div className="relative aspect-video bg-muted overflow-hidden" onClick={onClick}>
        <img src={clip.thumbnail} alt={clip.hook} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="size-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
        <span className={`absolute top-2 left-2 size-6 rounded text-xs font-bold flex items-center justify-center ${rankStyle}`}>
          #{clip.rank}
        </span>
        <span className="absolute bottom-2 right-2 text-xs font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">
          {clip.duration}
        </span>
        {clip.status === "vetoed" && (
          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
            <Ban className="size-8 text-red-400" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground truncate mb-1">{episode?.title ?? "Unknown episode"}</p>
        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-2">{clip.hook}</p>

        {/* Scores */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">LLM</span>
              <span className="text-[10px] font-mono text-primary">{clip.llmScore}</span>
            </div>
            <Progress value={clip.llmScore} className="h-1" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">VLM</span>
              <span className="text-[10px] font-mono text-purple-400">{clip.vlmScore}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${clip.vlmScore}%` }} />
            </div>
          </div>
        </div>

        {/* Platform status row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {Object.entries(clip.platforms).map(([p, status]) => {
              const pi = platformIcons[p]
              return pi ? (
                <div
                  key={p}
                  title={`${p}: ${status}`}
                  className={`size-4 rounded-sm text-[8px] font-bold flex items-center justify-center`}
                  style={{
                    background: status === "posted" ? pi.color + "33" : status === "failed" ? "#ef444433" : "#33333366",
                    border: `1px solid ${status === "posted" ? pi.color + "66" : status === "failed" ? "#ef444466" : "#33333366"}`,
                    color: status === "posted" ? pi.color : status === "failed" ? "#ef4444" : "#64748b",
                  }}
                >
                  {pi.short}
                </div>
              ) : null
            })}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-foreground">
                <MoreVertical className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem className="text-xs gap-2"><Eye className="size-3" /> Preview</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2"><Check className="size-3" /> Approve</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2"><Download className="size-3" /> Download</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 text-red-400 focus:text-red-400">
                <Ban className="size-3" /> Veto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function ClipModal({ clip, onClose }: { clip: typeof clips[0] | null; onClose: () => void }) {
  const [tab, setTab] = useState("info")
  if (!clip) return null
  const episode = episodes.find(e => e.id === clip.episodeId)

  return (
    <Dialog open={!!clip} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-0">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
          {/* Video side */}
          <div className="md:col-span-3 bg-black">
            <div className="relative aspect-video">
              <img src={clip.thumbnail} alt={clip.hook} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <button className="size-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Play className="size-7 text-white ml-1" fill="white" />
                </button>
              </div>
            </div>
            {/* Format tabs */}
            <div className="flex border-t border-border">
              {["9:16", "1:1", "16:9"].map(fmt => (
                <button
                  key={fmt}
                  className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors font-mono"
                >
                  {fmt}
                </button>
              ))}
            </div>
            {/* Waveform placeholder */}
            <div className="p-3">
              <div className="h-12 bg-accent/30 rounded-lg flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-8">
                  {Array.from({ length: 60 }, (_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-sm bg-primary/50"
                      style={{ height: `${20 + Math.random() * 60}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Details side */}
          <div className="md:col-span-2 p-4 flex flex-col">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-sm font-semibold leading-snug">{clip.hook}</DialogTitle>
            </DialogHeader>

            {/* Tab nav */}
            <div className="flex gap-1 mb-4 border-b border-border pb-2">
              {["info", "copy", "posting", "analytics"].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-2 py-1 text-xs rounded capitalize transition-colors ${tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "info" && (
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Episode</p>
                    <p className="text-xs font-medium text-foreground">{episode?.title ?? "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-xs font-mono text-foreground">{clip.duration}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LLM Score</p>
                    <p className="text-xs font-mono text-primary font-bold">{clip.llmScore}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">VLM Score</p>
                    <p className="text-xs font-mono text-purple-400 font-bold">{clip.vlmScore}/100</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rank</p>
                  <div className="flex items-center gap-2">
                    <Star className="size-3.5 text-yellow-500" fill="#eab308" />
                    <span className="text-sm font-bold text-foreground">#{clip.rank}</span>
                  </div>
                </div>
                {/* Feature radar placeholder */}
                <div className="rounded-lg bg-accent/20 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-2">Feature Breakdown</p>
                  {[
                    { label: "Linguistic", value: 82 },
                    { label: "Prosody", value: 76 },
                    { label: "Embedding Novelty", value: 68 },
                    { label: "Speaking Rate", value: 71 },
                    { label: "Turn Density", value: 84 },
                  ].map(f => (
                    <div key={f.label} className="mb-1.5">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs text-muted-foreground">{f.label}</span>
                        <span className="text-xs font-mono text-foreground">{f.value}</span>
                      </div>
                      <Progress value={f.value} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "posting" && (
              <div className="space-y-2 flex-1 overflow-y-auto">
                {Object.entries(clip.platforms).map(([p, status]) => {
                  const pi = platformIcons[p]
                  if (!pi) return null
                  const statusClass = status === "posted" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : status === "failed" ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : status === "skipped" ? "bg-muted/50 text-muted-foreground border-border"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  return (
                    <div key={p} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/30 border border-border">
                      <span
                        className="size-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: pi.color + "22", color: pi.color }}
                      >{pi.short}</span>
                      <span className="text-xs text-foreground flex-1 capitalize">{p}</span>
                      <Badge className={`text-xs border capitalize ${statusClass}`}>{status}</Badge>
                      {status === "failed" && (
                        <Button size="sm" variant="ghost" className="h-5 text-xs px-1.5 text-amber-400">Retry</Button>
                      )}
                    </div>
                  )
                })}
                <Button size="sm" className="w-full h-7 text-xs bg-primary hover:bg-primary/90 mt-2">
                  Post to All Platforms
                </Button>
              </div>
            )}

            {tab === "copy" && (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="text-foreground font-medium">YouTube</p>
                <p className="bg-accent/30 rounded p-2 text-xs">🔥 {clip.hook} | Full episode on YouTube</p>
                <p className="text-foreground font-medium mt-2">LinkedIn</p>
                <p className="bg-accent/30 rounded p-2 text-xs">Fascinating insight from the latest episode...</p>
              </div>
            )}

            {tab === "analytics" && clip.views > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-accent/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-foreground font-mono">{(clip.views / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="bg-accent/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-foreground font-mono">{clip.ctr}%</p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                  <div className="bg-accent/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-foreground font-mono">{clip.watchPct}%</p>
                    <p className="text-xs text-muted-foreground">Watch %</p>
                  </div>
                </div>
              </div>
            )}
            {tab === "analytics" && clip.views === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No analytics data yet</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Clips() {
  const [viewMode, setViewMode] = useState("grid")
  const [search, setSearch] = useState("")
  const [selectedClip, setSelectedClip] = useState<typeof clips[0] | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = clips.filter(c => {
    if (search && !c.hook.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    return true
  })

  const kanbanCols = ["generated", "approved", "posted", "vetoed"]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search clips..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-accent/50 border-border"
          />
        </div>
        <div className="flex gap-1">
          {["all", "posted", "approved", "generated", "vetoed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "grid", label: "Grid" },
            { value: "list", label: "List" },
            { value: "kanban", label: "Kanban" },
          ].map(m => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              className={`px-3 py-1.5 text-xs transition-colors ${viewMode === m.value ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(clip => (
            <ClipCard key={clip.id} clip={clip} onClick={() => setSelectedClip(clip)} />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <Card className="bg-card border-border card-top-border">
          <div className="divide-y divide-border">
            {filtered.map(clip => {
              const episode = episodes.find(e => e.id === clip.episodeId)
              return (
                <div key={clip.id} className="flex items-center gap-4 p-3 hover:bg-accent/20 cursor-pointer" onClick={() => setSelectedClip(clip)}>
                  <img src={clip.thumbnail} alt={clip.hook} className="w-24 aspect-video object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{episode?.title}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{clip.hook}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs h-4 px-1.5 bg-primary/20 text-primary border-0">#{clip.rank}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">LLM: {clip.llmScore}</span>
                      <span className="text-xs font-mono text-muted-foreground">VLM: {clip.vlmScore}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(clip.platforms).slice(0, 4).map(([p, status]) => {
                      const pi = platformIcons[p]
                      return pi ? (
                        <span key={p} className="size-4 rounded-sm flex items-center justify-center text-[8px] font-bold"
                          style={{ background: status === "posted" ? pi.color + "33" : "#33333366", color: status === "posted" ? pi.color : "#64748b" }}>
                          {pi.short}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Kanban view */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanCols.map(col => {
            const colClips = clips.filter(c => c.status === col)
            return (
              <div key={col} className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground capitalize">{col}</span>
                  <Badge variant="secondary" className="text-xs h-4 px-1.5">{colClips.length}</Badge>
                </div>
                {colClips.map(clip => (
                  <div key={clip.id} className="bg-card border border-border rounded-xl p-2.5 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedClip(clip)}>
                    <img src={clip.thumbnail} alt={clip.hook} className="w-full aspect-video object-cover rounded mb-2" />
                    <p className="text-xs font-medium text-foreground line-clamp-2">{clip.hook}</p>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <ClipModal clip={selectedClip} onClose={() => setSelectedClip(null)} />
    </div>
  )
}
