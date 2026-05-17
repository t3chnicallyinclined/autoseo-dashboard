import { useState } from "react"
import { Search, RefreshCw, Upload, CircleAlert as AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewJobDialog } from "@/components/NewJobDialog"
import { jobs, shows } from "@/data/sample"

const STATUS_PILLS = ["all", "pending", "transcribing", "rendering", "done", "failed"] as const

const statusColors: Record<string, string> = {
  done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  transcribing: "bg-primary/20 text-primary border-primary/50",
  rendering: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ranked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pending: "bg-muted/50 text-muted-foreground border-border",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
}

export default function Jobs() {
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newJobOpen, setNewJobOpen] = useState(false)

  const filtered = jobs.filter(j => {
    if (filter !== "all" && j.status !== filter) return false
    if (search && !j.media.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
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
        <div className="flex gap-1.5">
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
        <Button variant="outline" size="sm" className="h-8 text-xs border-border gap-1.5" onClick={() => setNewJobOpen(true)}>
          <Upload className="size-3" /> Ingest Media
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs border-border gap-1.5">
          <RefreshCw className="size-3" /> Retry Failed
        </Button>
      </div>

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
                return (
                  <>
                    <TableRow
                      key={job.id}
                      className={`border-border hover:bg-accent/20 cursor-pointer ${isExpanded ? "bg-accent/10" : ""}`}
                      onClick={() => setExpanded(isExpanded ? null : job.id)}
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2">View</Button>
                          {job.status === "failed" && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-amber-400">Retry</Button>
                          )}
                        </div>
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
                            {/* Error */}
                            {job.status === "failed" && (job as typeof job & { error?: string }).error && (
                              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-red-400 mb-0.5">Error</p>
                                  <p className="text-xs text-red-300/80 font-mono">{(job as typeof job & { error?: string }).error}</p>
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

      <NewJobDialog open={newJobOpen} onOpenChange={setNewJobOpen} />
    </div>
  )
}
