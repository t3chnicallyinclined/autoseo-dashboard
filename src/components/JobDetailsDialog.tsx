import { useEffect, useState } from "react"
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Loader as Loader2, FileVideo } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Job } from "@/api/types"

/** Local mini-clip used just for the in-dialog list — we don't need the full
 *  Clip adapter here; only rank/score/hook/duration/job-id. */
interface JobClipRow {
  id: string
  job_id: string
  rank: number | null
  score: number | null
  hook: string | null
  start_ms: number
  end_ms: number
}

const STAGE_ORDER = [
  { key: "pending", label: "Queued" },
  { key: "transcribing", label: "Transcribing" },
  { key: "rendering", label: "Ranking + Rendering" },
  { key: "done", label: "Complete" },
]

interface JobDetailsDialogProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JobDetailsDialog({ job, open, onOpenChange }: JobDetailsDialogProps) {
  const [clips, setClips] = useState<JobClipRow[]>([])
  const [loading, setLoading] = useState(false)

  // Pull clips for this job + auto-refresh every 5s while the dialog is open
  // and the job is still in progress.
  useEffect(() => {
    if (!open || !job) return
    let cancelled = false
    const refresh = async () => {
      setLoading(true)
      try {
        const resp = await fetch("/api/clips")
        if (!resp.ok) throw new Error(String(resp.status))
        const data = await resp.json() as { clips: JobClipRow[] }
        if (!cancelled) {
          const mine = (data.clips || [])
            .filter(c => c.job_id === job.id)
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
          setClips(mine)
        }
      } catch { /* leave clips as-is */ }
      finally { if (!cancelled) setLoading(false) }
    }
    refresh()
    if (job.status === "done" || job.status === "failed") return () => { cancelled = true }
    const t = setInterval(refresh, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [open, job?.id, job?.status])

  const fmtDuration = (c: JobClipRow): string => {
    const secs = Math.max(0, Math.floor((c.end_ms - c.start_ms) / 1000))
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
  }

  if (!job) return null

  const currentStageIdx = STAGE_ORDER.findIndex(s => s.key === job.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="size-4 text-muted-foreground" />
            <span className="truncate">{job.media || job.id}</span>
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px]">{job.id}</DialogDescription>
        </DialogHeader>

        {/* Status + progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={
              job.status === "failed" ? "bg-red-500/20 text-red-400 border-red-500/30"
              : job.status === "done" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-primary/20 text-primary border-primary/50"
            }>
              {job.status === "failed" ? <AlertCircle className="size-3 mr-1" />
                : job.status === "done" ? <CheckCircle2 className="size-3 mr-1" />
                : <Loader2 className="size-3 mr-1 animate-spin" />}
              {job.stage}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{job.duration}</span>
            <span className="text-xs text-muted-foreground font-mono">${job.cost.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-auto">{job.clipsGenerated} clips so far</span>
          </div>

          <Progress value={job.progress} className="h-2" />

          {/* Stage strip */}
          <div className="flex items-center gap-1.5">
            {STAGE_ORDER.map((s, i) => {
              const reached = currentStageIdx >= i
              const isActive = currentStageIdx === i && job.status !== "done" && job.status !== "failed"
              return (
                <div
                  key={s.key}
                  className={`flex-1 text-[10px] uppercase tracking-wider text-center py-1 rounded ${
                    reached ? (isActive ? "bg-primary/30 text-primary" : "bg-emerald-500/20 text-emerald-400")
                    : "bg-accent/40 text-muted-foreground"
                  }`}
                >
                  {s.label}
                </div>
              )
            })}
          </div>

          {job.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
              <div className="text-xs uppercase tracking-wider text-red-300 mb-1">Error</div>
              <pre className="text-xs text-red-200 whitespace-pre-wrap break-words font-mono">{job.error}</pre>
            </div>
          )}
        </div>

        {/* Clips so far */}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Clips produced</h3>
            {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          </div>
          {clips.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              {job.status === "done" || job.status === "failed"
                ? "No clips were produced for this job."
                : "Clips appear here as the worker ranks and renders them."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {clips.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs bg-accent/30 rounded px-2 py-1.5">
                  <span className="font-mono text-muted-foreground w-6">#{c.rank ?? "?"}</span>
                  <span className="font-mono text-primary w-9">{c.score ?? "—"}</span>
                  <span className="flex-1 truncate text-foreground/90">{c.hook}</span>
                  <span className="font-mono text-muted-foreground text-[10px]">{fmtDuration(c)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
