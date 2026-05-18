import { useState, useEffect, useCallback } from "react"
import { Play, MoveVertical as MoreVertical, Eye, Check, Ban, Search, Star, Send, Loader2, CheckSquare, Square, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { clips as sampleClips, episodes } from "@/data/sample"
import * as api from "@/lib/api"

const platformIcons: Record<string, { short: string; color: string }> = {
  youtube: { short: "YT", color: "#ef4444" },
  bluesky: { short: "BS", color: "#0085ff" },
  tiktok: { short: "TT", color: "#ff0050" },
  instagram: { short: "IG", color: "#e1306c" },
  linkedin: { short: "LI", color: "#0077b5" },
  threads: { short: "TH", color: "#888" },
}

// Unified clip type that works with both sample data and API data
type UIClip = typeof sampleClips[0]

// Convert API clip to UI clip shape (for seamless transition when backend is connected)
function apiClipToUI(c: api.Clip): UIClip {
  const durationSec = Math.round((c.end_ms - c.start_ms) / 1000)
  const min = Math.floor(durationSec / 60)
  const sec = durationSec % 60
  const platforms: Record<string, string> = {}
  for (const p of c.posts) {
    platforms[p.platform] = p.status
  }
  return {
    id: c.id,
    episodeId: c.job_id,
    rank: c.rank ?? 0,
    hook: c.hook ?? "(no hook)",
    duration: `${min}:${sec.toString().padStart(2, "0")}`,
    llmScore: Math.round((c.score ?? 0) * 100) / 100,
    vlmScore: 0,
    status: c.status,
    thumbnail: `https://picsum.photos/seed/${c.id}/320/180`,
    platforms,
    views: 0,
    ctr: 0,
    watchPct: 0,
  }
}

// --- Post Dialog ---
function PostDialog({ open, onClose, clipIds, onPost }: {
  open: boolean
  onClose: () => void
  clipIds: string[]
  onPost: (platforms: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({
    youtube: true,
    bluesky: true,
  })
  const [posting, setPosting] = useState(false)

  const toggle = (p: string) => setSelected(s => ({ ...s, [p]: !s[p] }))

  const handlePost = async () => {
    const platforms = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (platforms.length === 0) return
    setPosting(true)
    try {
      await onPost(platforms)
      onClose()
    } finally {
      setPosting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm">Post {clipIds.length} clip{clipIds.length > 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-xs text-muted-foreground mb-2">Select platforms:</p>
          {Object.entries(platformIcons).map(([p, pi]) => (
            <label key={p} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30 border border-border cursor-pointer hover:border-primary/30">
              <input
                type="checkbox"
                checked={!!selected[p]}
                onChange={() => toggle(p)}
                className="accent-primary"
              />
              <span className="size-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: pi.color + "22", color: pi.color }}>{pi.short}</span>
              <span className="text-xs text-foreground flex-1 capitalize">{p}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handlePost} disabled={posting} className="text-xs bg-primary">
            {posting ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
            Post Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Clip Card ---
function ClipCard({ clip, onClick, selected, onSelect, onApprove, onVeto }: {
  clip: UIClip
  onClick: () => void
  selected: boolean
  onSelect: () => void
  onApprove: () => void
  onVeto: () => void
}) {
  const episode = episodes.find(e => e.id === clip.episodeId)
  const rankStyle = clip.rank === 1
    ? "bg-yellow-500 text-black"
    : clip.rank === 2
      ? "bg-gray-300 text-black"
      : clip.rank === 3
        ? "bg-amber-700 text-white"
        : "bg-black/60 text-white"

  return (
    <Card className={`bg-card border-border overflow-hidden hover:border-primary/30 hover:glow-blue transition-all cursor-pointer group ${selected ? "ring-2 ring-primary" : ""}`}>
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
        <p className="text-xs text-muted-foreground truncate mb-1">{episode?.title ?? clip.episodeId}</p>
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
          {clip.vlmScore > 0 && (
            <div className="flex-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground">VLM</span>
                <span className="text-[10px] font-mono text-purple-400">{clip.vlmScore}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${clip.vlmScore}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Platform status + actions row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onSelect() }} className="mr-1">
              {selected
                ? <CheckSquare className="size-3.5 text-primary" />
                : <Square className="size-3.5 text-muted-foreground hover:text-foreground" />
              }
            </button>
            {Object.entries(clip.platforms).map(([p, status]) => {
              const pi = platformIcons[p]
              return pi ? (
                <div
                  key={p}
                  title={`${p}: ${status}`}
                  className="size-4 rounded-sm text-[8px] font-bold flex items-center justify-center"
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
              <DropdownMenuItem className="text-xs gap-2" onClick={onClick}><Eye className="size-3" /> Preview</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={onApprove}><Check className="size-3" /> Approve</DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 text-red-400 focus:text-red-400" onClick={onVeto}>
                <Ban className="size-3" /> Veto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Clip Detail Modal ---
function ClipModal({ clip, onClose, onApprove, onVeto, onPost, onHookChange }: {
  clip: UIClip | null
  onClose: () => void
  onApprove: (id: string) => void
  onVeto: (id: string) => void
  onPost: (ids: string[]) => void
  onHookChange: (id: string, hook: string) => void
}) {
  const [tab, setTab] = useState("info")
  const [editingHook, setEditingHook] = useState(false)
  const [hookDraft, setHookDraft] = useState("")
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
                <button key={fmt} className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors font-mono">{fmt}</button>
              ))}
            </div>
            {/* Waveform placeholder */}
            <div className="p-3">
              <div className="h-12 bg-accent/30 rounded-lg flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-8">
                  {Array.from({ length: 60 }, (_, i) => (
                    <div key={i} className="w-1 rounded-sm bg-primary/50" style={{ height: `${20 + Math.random() * 60}%` }} />
                  ))}
                </div>
              </div>
            </div>
            {/* Action bar */}
            <div className="flex gap-2 p-3 border-t border-border">
              {clip.status !== "approved" && clip.status !== "posted" && (
                <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(clip.id)}>
                  <Check className="size-3 mr-1" /> Approve
                </Button>
              )}
              {clip.status !== "vetoed" && (
                <Button size="sm" variant="outline" className="text-xs text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={() => onVeto(clip.id)}>
                  <Ban className="size-3 mr-1" /> Veto
                </Button>
              )}
              {clip.status !== "vetoed" && (
                <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 ml-auto" onClick={() => onPost([clip.id])}>
                  <Send className="size-3 mr-1" /> Post
                </Button>
              )}
            </div>
          </div>

          {/* Details side */}
          <div className="md:col-span-2 p-4 flex flex-col">
            <DialogHeader className="mb-3">
              {editingHook ? (
                <div className="flex gap-1">
                  <Input
                    value={hookDraft}
                    onChange={e => setHookDraft(e.target.value)}
                    className="text-sm h-7"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") { onHookChange(clip.id, hookDraft); setEditingHook(false) }
                      if (e.key === "Escape") setEditingHook(false)
                    }}
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={() => { onHookChange(clip.id, hookDraft); setEditingHook(false) }}>Save</Button>
                </div>
              ) : (
                <DialogTitle
                  className="text-sm font-semibold leading-snug cursor-pointer hover:text-primary"
                  onClick={() => { setHookDraft(clip.hook); setEditingHook(true) }}
                  title="Click to edit"
                >
                  {clip.hook}
                </DialogTitle>
              )}
            </DialogHeader>

            {/* Status badge */}
            <div className="mb-3">
              <Badge className={`text-xs capitalize ${
                clip.status === "posted" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : clip.status === "approved" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : clip.status === "vetoed" ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}>{clip.status}</Badge>
            </div>

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
                    <p className="text-xs font-medium text-foreground">{episode?.title ?? clip.episodeId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-xs font-mono text-foreground">{clip.duration}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LLM Score</p>
                    <p className="text-xs font-mono text-primary font-bold">{clip.llmScore}/100</p>
                  </div>
                  {clip.vlmScore > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">VLM Score</p>
                      <p className="text-xs font-mono text-purple-400 font-bold">{clip.vlmScore}/100</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rank</p>
                  <div className="flex items-center gap-2">
                    <Star className="size-3.5 text-yellow-500" fill="#eab308" />
                    <span className="text-sm font-bold text-foreground">#{clip.rank}</span>
                  </div>
                </div>
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
                      <span className="size-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: pi.color + "22", color: pi.color }}>{pi.short}</span>
                      <span className="text-xs text-foreground flex-1 capitalize">{p}</span>
                      <Badge className={`text-xs border capitalize ${statusClass}`}>{status}</Badge>
                    </div>
                  )
                })}
                {Object.keys(clip.platforms).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No posts yet</p>
                )}
                <Button size="sm" className="w-full h-7 text-xs bg-primary hover:bg-primary/90 mt-2" onClick={() => onPost([clip.id])}>
                  <Send className="size-3 mr-1" /> Post to Platforms
                </Button>
              </div>
            )}

            {tab === "copy" && (
              <div className="space-y-2 text-xs text-muted-foreground flex-1 overflow-y-auto">
                <p className="text-foreground font-medium">YouTube</p>
                <div className="bg-accent/30 rounded p-2 text-xs">{clip.hook} | Full episode on YouTube</div>
                <p className="text-foreground font-medium mt-2">Bluesky</p>
                <div className="bg-accent/30 rounded p-2 text-xs">{clip.hook}</div>
                <p className="text-foreground font-medium mt-2">LinkedIn</p>
                <div className="bg-accent/30 rounded p-2 text-xs">Fascinating insight from the latest episode...</div>
                <p className="text-[10px] text-muted-foreground mt-3 italic">Social copy is auto-generated. Click to edit inline when connected to the API.</p>
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

// --- Main Clips Page ---
export default function Clips() {
  const [viewMode, setViewMode] = useState("grid")
  const [search, setSearch] = useState("")
  const [selectedClip, setSelectedClip] = useState<UIClip | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [postTargetIds, setPostTargetIds] = useState<string[]>([])
  const [clips, setClips] = useState<UIClip[]>(sampleClips)
  const [loading, setLoading] = useState(false)
  const [useApi, setUseApi] = useState(false)

  // Attempt to load clips from API; fall back to sample data
  const loadClips = useCallback(async () => {
    setLoading(true)
    try {
      const apiClips = await api.listClips()
      if (apiClips.length > 0) {
        setClips(apiClips.map(apiClipToUI))
        setUseApi(true)
      } else {
        setClips(sampleClips)
        setUseApi(false)
      }
    } catch {
      // API not available — use sample data
      setClips(sampleClips)
      setUseApi(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClips() }, [loadClips])

  const filtered = clips.filter(c => {
    if (search && !c.hook.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    return true
  })

  const kanbanCols = ["generated", "approved", "posted", "vetoed"]

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)))
    }
  }

  const handleApprove = async (id: string) => {
    if (useApi) {
      try {
        await api.approveClip(id)
        await loadClips()
      } catch (e) { console.error("approve failed", e) }
    } else {
      setClips(prev => prev.map(c => c.id === id ? { ...c, status: "approved" } : c))
    }
    if (selectedClip?.id === id) {
      setSelectedClip(prev => prev ? { ...prev, status: "approved" } : null)
    }
  }

  const handleVeto = async (id: string) => {
    if (useApi) {
      try {
        await api.vetoClip(id)
        await loadClips()
      } catch (e) { console.error("veto failed", e) }
    } else {
      setClips(prev => prev.map(c => c.id === id ? { ...c, status: "vetoed" } : c))
    }
    if (selectedClip?.id === id) {
      setSelectedClip(prev => prev ? { ...prev, status: "vetoed" } : null)
    }
  }

  const handleHookChange = async (id: string, hook: string) => {
    if (useApi) {
      try {
        await api.patchClip(id, { hook })
        await loadClips()
      } catch (e) { console.error("hook update failed", e) }
    } else {
      setClips(prev => prev.map(c => c.id === id ? { ...c, hook } : c))
    }
    if (selectedClip?.id === id) {
      setSelectedClip(prev => prev ? { ...prev, hook } : null)
    }
  }

  const openPostDialog = (ids: string[]) => {
    setPostTargetIds(ids)
    setPostDialogOpen(true)
  }

  const handlePost = async (platforms: string[]) => {
    if (useApi) {
      try {
        if (postTargetIds.length === 1) {
          await api.postClip(postTargetIds[0], platforms)
        } else {
          await api.bulkAction(postTargetIds, "post", platforms)
        }
        await loadClips()
      } catch (e) { console.error("post failed", e) }
    } else {
      setClips(prev => prev.map(c =>
        postTargetIds.includes(c.id) ? { ...c, status: "posted" } : c
      ))
    }
    setSelectedIds(new Set())
  }

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds)
    if (useApi) {
      try {
        await api.bulkAction(ids, "approve")
        await loadClips()
      } catch (e) { console.error("bulk approve failed", e) }
    } else {
      setClips(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, status: "approved" } : c))
    }
    setSelectedIds(new Set())
  }

  const handleBulkVeto = async () => {
    const ids = Array.from(selectedIds)
    if (useApi) {
      try {
        await api.bulkAction(ids, "veto")
        await loadClips()
      } catch (e) { console.error("bulk veto failed", e) }
    } else {
      setClips(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, status: "vetoed" } : c))
    }
    setSelectedIds(new Set())
  }

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
        <Button variant="ghost" size="icon" className="size-7" onClick={loadClips} title="Refresh">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 rounded-lg">
          <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleBulkApprove}>
            <Check className="size-3 mr-1" /> Approve
          </Button>
          <Button size="sm" className="h-6 text-xs bg-primary hover:bg-primary/90" onClick={() => openPostDialog(Array.from(selectedIds))}>
            <Send className="size-3 mr-1" /> Post
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={handleBulkVeto}>
            <Ban className="size-3 mr-1" /> Veto
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {selectedIds.size === filtered.length
                  ? <CheckSquare className="size-3.5 text-primary" />
                  : <Square className="size-3.5" />
                }
                {selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(clip => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onClick={() => setSelectedClip(clip)}
                selected={selectedIds.has(clip.id)}
                onSelect={() => toggleSelect(clip.id)}
                onApprove={() => handleApprove(clip.id)}
                onVeto={() => handleVeto(clip.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <Card className="bg-card border-border card-top-border">
          <div className="divide-y divide-border">
            {filtered.map(clip => {
              const episode = episodes.find(e => e.id === clip.episodeId)
              return (
                <div key={clip.id} className="flex items-center gap-4 p-3 hover:bg-accent/20 cursor-pointer">
                  <button onClick={() => toggleSelect(clip.id)} className="shrink-0">
                    {selectedIds.has(clip.id)
                      ? <CheckSquare className="size-4 text-primary" />
                      : <Square className="size-4 text-muted-foreground hover:text-foreground" />
                    }
                  </button>
                  <img src={clip.thumbnail} alt={clip.hook} className="w-24 aspect-video object-cover rounded" onClick={() => setSelectedClip(clip)} />
                  <div className="flex-1 min-w-0" onClick={() => setSelectedClip(clip)}>
                    <p className="text-xs text-muted-foreground truncate">{episode?.title ?? clip.episodeId}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{clip.hook}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs h-4 px-1.5 bg-primary/20 text-primary border-0">#{clip.rank}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">LLM: {clip.llmScore}</span>
                      {clip.vlmScore > 0 && <span className="text-xs font-mono text-muted-foreground">VLM: {clip.vlmScore}</span>}
                      <Badge className={`text-xs h-4 px-1.5 capitalize ${
                        clip.status === "posted" ? "bg-emerald-500/20 text-emerald-400"
                        : clip.status === "approved" ? "bg-blue-500/20 text-blue-400"
                        : clip.status === "vetoed" ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                      } border-0`}>{clip.status}</Badge>
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
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="size-6" title="Approve" onClick={() => handleApprove(clip.id)}>
                      <Check className="size-3 text-emerald-400" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-6" title="Veto" onClick={() => handleVeto(clip.id)}>
                      <Ban className="size-3 text-red-400" />
                    </Button>
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
                    <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">{clip.hook}</p>
                    <div className="flex gap-1">
                      {col === "generated" && (
                        <Button size="sm" className="h-5 text-[10px] px-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); handleApprove(clip.id) }}>
                          Approve
                        </Button>
                      )}
                      {col === "approved" && (
                        <Button size="sm" className="h-5 text-[10px] px-1.5 bg-primary hover:bg-primary/90" onClick={(e) => { e.stopPropagation(); openPostDialog([clip.id]) }}>
                          Post
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <ClipModal
        clip={selectedClip}
        onClose={() => setSelectedClip(null)}
        onApprove={handleApprove}
        onVeto={handleVeto}
        onPost={openPostDialog}
        onHookChange={handleHookChange}
      />

      <PostDialog
        open={postDialogOpen}
        onClose={() => setPostDialogOpen(false)}
        clipIds={postTargetIds}
        onPost={handlePost}
      />
    </div>
  )
}
