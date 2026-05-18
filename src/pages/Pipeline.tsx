import { useState, useCallback } from "react"
import { CircleCheck as CheckCircle2, Loader as Loader2, Clock, CircleAlert as AlertCircle, RefreshCw, Pause, Play, XCircle, RotateCcw, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useJobs } from "@/hooks/use-jobs"
import { shows, pipelineStages } from "@/data/sample"
import type { JobStatus } from "@/services/api"

const stageDescriptions: Record<string, { stats: string; config: string }> = {
  ingest: { stats: "Polled 12 emails, found 1 new attachment", config: "Gmail filter: label:podcast-ingest" },
  download: { stats: "Downloaded 2.4 GB in 3m 12s", config: "Google Drive API, parallel chunks: 4" },
  audio: { stats: "Extracted 3h 22m of audio at 44.1kHz", config: "ffmpeg -vn -ar 44100 -ac 1" },
  transcribe: { stats: "12,480 tokens processed, 98.4% confidence", config: "Whisper large-v3, concurrency: 4, RPM: 60" },
  features: { stats: "VAD: 8,420 speech segments | Prosody: peaks detected", config: "silero-vad, librosa, sentence-transformers" },
  rank: { stats: "15 candidates → 12 clips selected", config: "GPT-4o, top-K: 12, batch: 5" },
  render: { stats: "36 variants rendered (12 clips × 3 formats)", config: "ffmpeg, 9:16 + 1:1 + 16:9, LUFS: -14" },
  post: { stats: "Attempted 24 posts, 22 success, 2 failed", config: "dry_run: false, auto_publish: true" },
}

const statusConfig = {
  done: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Done" },
  active: { color: "bg-primary/20 text-primary border-primary/50", icon: Loader2, label: "Active" },
  idle: { color: "bg-muted/50 text-muted-foreground border-border", icon: Clock, label: "Idle" },
  failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle, label: "Failed" },
}

const jobStatusColors: Record<string, string> = {
  done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  transcribing: "bg-primary/20 text-primary border-primary/50",
  rendering: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ranked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cancelled: "bg-muted/50 text-muted-foreground border-border",
  pending: "bg-muted/50 text-muted-foreground border-border",
}

function isRunning(status: JobStatus): boolean {
  return status === "pending" || status === "transcribing" || status === "rendering"
}

type ConfirmAction = { type: "cancel" | "delete"; jobId: string; media: string } | null

export default function Pipeline() {
  const { jobs, pauseJob, resumeJob, retryJob, cancelJob, deleteJob, refresh } = useJobs()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

  const activeCount = jobs.filter(j => isRunning(j.status) || j.status === "paused").length

  const handleAction = useCallback((action: "pause" | "resume" | "retry" | "cancel" | "delete", jobId: string, media: string) => {
    if (action === "cancel" || action === "delete") {
      setConfirmAction({ type: action, jobId, media })
      return
    }
    const labels = { pause: "Paused", resume: "Resumed", retry: "Retrying" }
    if (action === "pause") pauseJob(jobId)
    else if (action === "resume") resumeJob(jobId)
    else if (action === "retry") retryJob(jobId)
    toast.success(`${labels[action]} job`, { description: media })
  }, [pauseJob, resumeJob, retryJob])

  const confirmExecute = useCallback(() => {
    if (!confirmAction) return
    if (confirmAction.type === "cancel") {
      cancelJob(confirmAction.jobId)
      toast.success("Cancelled job", { description: confirmAction.media })
    } else {
      deleteJob(confirmAction.jobId)
      toast.success("Deleted job", { description: confirmAction.media })
    }
    setConfirmAction(null)
  }, [confirmAction, cancelJob, deleteJob])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Pipeline Diagram */}
        <Card className="bg-card border-border card-top-border overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pipeline Architecture</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500 status-pulse" />
                  <span>{activeCount} job{activeCount !== 1 ? "s" : ""} active</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border" onClick={refresh}>
                  <RefreshCw className="size-3 mr-1" /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex items-stretch gap-0 min-w-max">
                {pipelineStages.map((stage, i) => {
                  const status = stage.status as "done" | "active" | "idle" | "failed"
                  const cfg = statusConfig[status] || statusConfig.idle
                  const Icon = cfg.icon
                  const desc = stageDescriptions[stage.id]

                  return (
                    <div key={stage.id} className="flex items-center">
                      <div className={`group relative flex flex-col gap-2 p-3 rounded-xl border cursor-pointer hover:bg-accent/30 transition-all min-w-[130px] ${cfg.color} ${status === "active" ? "pipeline-active" : ""}`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`size-4 shrink-0 ${status === "active" ? "animate-spin" : ""}`} />
                          <span className="text-xs font-semibold">{stage.label}</span>
                        </div>
                        <span className="text-[10px] opacity-70">{stage.sublabel}</span>
                        {status !== "idle" && desc && (
                          <div className="hidden group-hover:block absolute top-full left-0 mt-2 z-10 bg-popover border border-border rounded-xl p-3 min-w-[240px] shadow-xl">
                            <p className="text-xs font-semibold text-foreground mb-1">Stats</p>
                            <p className="text-xs text-muted-foreground mb-2">{desc.stats}</p>
                            <p className="text-xs font-semibold text-foreground mb-1">Config</p>
                            <code className="text-xs text-primary font-mono">{desc.config}</code>
                          </div>
                        )}
                      </div>
                      {i < pipelineStages.length - 1 && (
                        <div className="w-6 h-px bg-gradient-to-r from-border to-border/50 mx-1 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Feature extraction sub-stages */}
            <div className="mt-4 ml-[calc(4*130px+4*32px)] w-[130px]">
              <div className="text-xs text-muted-foreground mb-1 text-center">Sub-stages</div>
              <div className="flex flex-wrap gap-1">
                {["VAD", "Prosody", "Scene", "Embed", "Ling"].map(s => (
                  <span key={s} className="text-[10px] bg-muted/50 text-muted-foreground rounded px-1.5 py-0.5 border border-border">{s}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Jobs Table */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Active & Recent Jobs</CardTitle>
              <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90">
                + New Job
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs pl-4">Job</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Show</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Stage</TableHead>
                  <TableHead className="text-muted-foreground text-xs w-32">Progress</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Clips</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Cost</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Duration</TableHead>
                  <TableHead className="text-muted-foreground text-xs pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => {
                  const show = shows.find(s => s.id === job.showId)
                  const statusClass = jobStatusColors[job.status] || "bg-muted/50 text-muted-foreground border-border"
                  const running = isRunning(job.status)
                  return (
                    <TableRow key={job.id} className="border-border hover:bg-accent/20">
                      <TableCell className="pl-4">
                        <div>
                          <p className="text-xs font-medium text-foreground truncate max-w-[180px]">{job.media}</p>
                          <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: show?.color ?? "#64748b" }} />
                          <span className="text-xs text-foreground">{show?.slug.toUpperCase() ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${statusClass} capitalize`}>{job.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground capitalize">{job.stage}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={job.progress} className="h-1 flex-1" />
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">{job.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-foreground">{job.clipsGenerated}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-foreground">${job.cost.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{job.duration}</span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center gap-1">
                          {running && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleAction("pause", job.id, job.media)}>
                                    <Pause className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Pause</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => handleAction("cancel", job.id, job.media)}>
                                    <XCircle className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Cancel</p></TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {job.status === "paused" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300" onClick={() => handleAction("resume", job.id, job.media)}>
                                  <Play className="size-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Resume</p></TooltipContent>
                            </Tooltip>
                          )}
                          {job.status === "failed" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300" onClick={() => handleAction("retry", job.id, job.media)}>
                                  <RotateCcw className="size-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Retry from failed stage</p></TooltipContent>
                            </Tooltip>
                          )}
                          {(job.status === "done" || job.status === "cancelled" || job.status === "failed") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => handleAction("delete", job.id, job.media)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete</p></TooltipContent>
                            </Tooltip>
                          )}
                          {job.status === "done" && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">View</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Confirmation dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === "delete" ? "Delete job?" : "Cancel job?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.type === "delete"
                  ? `This will permanently delete "${confirmAction.media}" and all its clips and renders. This cannot be undone.`
                  : `This will cancel "${confirmAction?.media}" and clean up partial renders. The job cannot be resumed after cancellation.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                className={confirmAction?.type === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
                onClick={confirmExecute}
              >
                {confirmAction?.type === "delete" ? "Delete" : "Cancel Job"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
