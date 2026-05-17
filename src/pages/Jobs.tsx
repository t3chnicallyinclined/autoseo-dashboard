import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, Upload, CircleAlert as AlertCircle, ChevronDown, ChevronUp, Pause, Play, RotateCcw, XCircle, Trash2, MoreHorizontal } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useJobs } from "@/hooks/use-jobs"
import { shows } from "@/data/sample"
import type { JobStatus } from "@/services/api"

const STATUS_PILLS = ["all", "pending", "transcribing", "rendering", "paused", "done", "failed", "cancelled"] as const

const statusColors: Record<string, string> = {
  done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  transcribing: "bg-primary/20 text-primary border-primary/50",
  rendering: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ranked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pending: "bg-muted/50 text-muted-foreground border-border",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cancelled: "bg-muted/50 text-muted-foreground border-border line-through",
}

type ConfirmAction = { type: "cancel" | "delete"; jobId: string; media: string } | null

export default function Jobs() {
  const { jobs, selectedJobId, setSelectedJobId, pauseJob, resumeJob, retryJob, cancelJob, deleteJob, refresh } = useJobs()
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

  const filtered = jobs.filter(j => {
    if (filter !== "all" && j.status !== filter) return false
    if (search && !j.media.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!selectedJobId) return
      const job = jobs.find(j => j.id === selectedJobId)
      if (!job) return

      if (e.key === "r" || e.key === "R") {
        if (job.status === "failed") {
          e.preventDefault()
          handleAction("retry", job.id, job.media)
        }
      } else if (e.key === "Escape") {
        if (isRunning(job.status)) {
          e.preventDefault()
          handleAction("cancel", job.id, job.media)
        } else {
          setSelectedJobId(null)
        }
      } else if (e.key === "p" || e.key === "P") {
        if (isRunning(job.status)) {
          e.preventDefault()
          handleAction("pause", job.id, job.media)
        } else if (job.status === "paused") {
          e.preventDefault()
          handleAction("resume", job.id, job.media)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedJobId, jobs, handleAction])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Header actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-accent/50 border-border"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_PILLS.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${filter === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-8 text-xs border-border gap-1.5">
            <Upload className="size-3" /> Ingest Media
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border gap-1.5"
            onClick={() => {
              const failedJobs = jobs.filter(j => j.status === "failed")
              failedJobs.forEach(j => retryJob(j.id))
              if (failedJobs.length > 0) toast.success(`Retrying ${failedJobs.length} failed job(s)`)
            }}
          >
            <RefreshCw className="size-3" /> Retry Failed
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        {selectedJobId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/30 rounded-lg px-3 py-1.5 border border-border">
            <span>Selected: <span className="text-foreground font-medium">{jobs.find(j => j.id === selectedJobId)?.media}</span></span>
            <span className="text-muted-foreground/60">|</span>
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">R</kbd> Retry
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">P</kbd> Pause/Resume
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Esc</kbd> Cancel
          </div>
        )}

        {/* Table */}
        <Card className="bg-card border-border card-top-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground pl-4 w-8" />
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Media</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Show</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Stage</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Clips</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Posts</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Cost</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Duration</TableHead>
                  <TableHead className="text-xs text-muted-foreground pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(job => {
                  const show = shows.find(s => s.id === job.showId)
                  const isExpanded = expanded === job.id
                  const isSelected = selectedJobId === job.id
                  return (
                    <>
                      <TableRow
                        key={job.id}
                        className={`border-border hover:bg-accent/20 cursor-pointer ${isExpanded ? "bg-accent/10" : ""} ${isSelected ? "ring-1 ring-primary/50" : ""}`}
                        onClick={() => {
                          setExpanded(isExpanded ? null : job.id)
                          setSelectedJobId(job.id)
                        }}
                      >
                        <TableCell className="pl-4">
                          {isExpanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs border capitalize ${statusColors[job.status] ?? "bg-muted/50 text-muted-foreground border-border"}`}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium text-foreground max-w-[180px] truncate">{job.media}</p>
                          <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full shrink-0" style={{ background: show?.color ?? "#64748b" }} />
                            <span className="text-xs text-foreground">{show?.name ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground capitalize">{job.stage}</span>
                            <Progress value={job.progress} className="h-1 w-20" />
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs font-mono text-foreground">{job.clipsGenerated}</span></TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-foreground">{job.postsSuccess}/{job.postsTotal}</span>
                        </TableCell>
                        <TableCell><span className="text-xs font-mono text-foreground">${job.cost.toFixed(2)}</span></TableCell>
                        <TableCell><span className="text-xs font-mono text-muted-foreground">{job.duration}</span></TableCell>
                        <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                          <JobActions job={job} onAction={handleAction} />
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${job.id}-expanded`} className="border-border hover:bg-transparent">
                          <TableCell colSpan={10} className="py-0 px-4">
                            <div className="py-3 space-y-3">
                              {/* Pipeline timeline */}
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {["ingest","download","audio","transcribe","features","rank","render","post"].map((stage, i) => {
                                  const isDone = job.progress > (i / 7) * 100
                                  const isActive = !isDone && job.progress > ((i - 1) / 7) * 100
                                  return (
                                    <div key={stage} className="flex items-center gap-1 shrink-0">
                                      <div className={`px-2 py-1 rounded text-xs border ${isDone ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : isActive ? "bg-primary/20 text-primary border-primary/50 pipeline-active" : "bg-muted/30 text-muted-foreground/50 border-border/50"}`}>
                                        {stage}
                                      </div>
                                      {i < 7 && <div className="w-3 h-px bg-border" />}
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Expanded action bar */}
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/20 border border-border">
                                <span className="text-xs text-muted-foreground mr-2">Actions:</span>
                                {isRunning(job.status) && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction("pause", job.id, job.media)}>
                                          <Pause className="size-3" /> Pause
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Pause job (saves state) — <kbd>P</kbd></p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300" onClick={() => handleAction("cancel", job.id, job.media)}>
                                          <XCircle className="size-3" /> Cancel
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Cancel job — <kbd>Esc</kbd></p></TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                {job.status === "paused" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300" onClick={() => handleAction("resume", job.id, job.media)}>
                                        <Play className="size-3" /> Resume
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Resume from where it left off — <kbd>P</kbd></p></TooltipContent>
                                  </Tooltip>
                                )}
                                {job.status === "failed" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-amber-400 hover:text-amber-300" onClick={() => handleAction("retry", job.id, job.media)}>
                                        <RotateCcw className="size-3" /> Retry
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Retry from last successful stage — <kbd>R</kbd></p></TooltipContent>
                                  </Tooltip>
                                )}
                                {(job.status === "done" || job.status === "cancelled" || job.status === "failed") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300" onClick={() => handleAction("delete", job.id, job.media)}>
                                        <Trash2 className="size-3" /> Delete
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Delete job + clips/renders</p></TooltipContent>
                                  </Tooltip>
                                )}
                              </div>

                              {/* Error */}
                              {job.status === "failed" && job.error && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-semibold text-red-400 mb-0.5">Error</p>
                                    <p className="text-xs text-red-300/80 font-mono">{job.error}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No jobs found</p>
              </div>
            )}
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

function isRunning(status: JobStatus): boolean {
  return status === "pending" || status === "transcribing" || status === "rendering"
}

function JobActions({ job, onAction }: { job: { id: string; media: string; status: JobStatus }; onAction: (action: "pause" | "resume" | "retry" | "cancel" | "delete", id: string, media: string) => void }) {
  const running = isRunning(job.status)

  return (
    <div className="flex gap-1 items-center">
      {/* Primary inline actions based on status */}
      {running && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => onAction("pause", job.id, job.media)}>
              <Pause className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Pause</p></TooltipContent>
        </Tooltip>
      )}
      {job.status === "paused" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-emerald-400" onClick={() => onAction("resume", job.id, job.media)}>
              <Play className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Resume</p></TooltipContent>
        </Tooltip>
      )}
      {job.status === "failed" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-amber-400" onClick={() => onAction("retry", job.id, job.media)}>
              <RotateCcw className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Retry</p></TooltipContent>
        </Tooltip>
      )}

      {/* Overflow menu for all actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem className="text-xs">View details</DropdownMenuItem>
          {running && (
            <>
              <DropdownMenuItem className="text-xs" onClick={() => onAction("pause", job.id, job.media)}>
                <Pause className="size-3 mr-2" /> Pause
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-red-400" onClick={() => onAction("cancel", job.id, job.media)}>
                <XCircle className="size-3 mr-2" /> Cancel
              </DropdownMenuItem>
            </>
          )}
          {job.status === "paused" && (
            <DropdownMenuItem className="text-xs" onClick={() => onAction("resume", job.id, job.media)}>
              <Play className="size-3 mr-2" /> Resume
            </DropdownMenuItem>
          )}
          {job.status === "failed" && (
            <DropdownMenuItem className="text-xs" onClick={() => onAction("retry", job.id, job.media)}>
              <RotateCcw className="size-3 mr-2" /> Retry from failed stage
            </DropdownMenuItem>
          )}
          {(job.status === "done" || job.status === "cancelled" || job.status === "failed") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red-400" onClick={() => onAction("delete", job.id, job.media)}>
                <Trash2 className="size-3 mr-2" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
