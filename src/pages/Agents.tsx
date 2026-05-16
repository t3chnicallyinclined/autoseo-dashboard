import { Loader as Loader2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { agents } from "@/data/sample"

const recentTasks = [
  { agent: "Atlas", issue: "JRE #2247 ranking pass", status: "success", started: "09:12:04", duration: "8m 22s", result: "12 clips" },
  { agent: "Render", issue: "Render 9:16 variants × 12", status: "success", started: "09:20:48", duration: "3m 15s", result: "36 files" },
  { agent: "Platform", issue: "Post top-3 clips to YouTube", status: "success", started: "09:24:10", duration: "1m 08s", result: "3 posted" },
  { agent: "Sentinel", issue: "Health check cycle", status: "success", started: "09:25:00", duration: "0m 04s", result: "All healthy" },
  { agent: "Platform", issue: "Post clip to Bluesky", status: "failed", started: "09:26:14", duration: "0m 32s", result: "API 429" },
  { agent: "Atlas", issue: "Lex #450 ranking pass", status: "running", started: "09:32:00", duration: "2m 34s", result: "In progress" },
]

export default function Agents() {
  return (
    <div className="space-y-6">
      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map(agent => (
          <Card key={agent.id} className="bg-card border-border card-top-border overflow-hidden">
            <div className="h-1" style={{ background: `linear-gradient(to right, ${agent.color}88, ${agent.color}22)` }} />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="size-10 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: `${agent.color}22`, border: `2px solid ${agent.color}66` }}
                  >
                    <span style={{ color: agent.color }}>{agent.name[0]}</span>
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${agent.status === "working" ? "bg-emerald-500 status-pulse" : agent.status === "error" ? "bg-red-500" : "bg-muted-foreground"}`}
                  />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold" style={{ color: agent.color }}>{agent.name}</CardTitle>
                  <p className={`text-xs ${agent.status === "working" ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {agent.status === "working" ? "Working" : "Idle"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-snug">{agent.role}</p>

              {/* Current task */}
              {agent.status === "working" && agent.currentTask && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Loader2 className="size-3 animate-spin text-primary" />
                    <span className="text-xs text-primary font-medium">Active Task</span>
                    <span className="text-xs font-mono text-primary/70 ml-auto">{agent.elapsed}</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-snug">{agent.currentTask}</p>
                </div>
              )}

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {agent.skills.map(s => (
                  <Badge key={s} variant="secondary" className="text-[10px] h-4 px-1.5">{s}</Badge>
                ))}
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-foreground font-mono">{agent.tasksCompleted.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground font-mono">{agent.avgDuration}</p>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400 font-mono">{agent.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task history table */}
      <Card className="bg-card border-border card-top-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Task History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground pl-4">Agent</TableHead>
                <TableHead className="text-xs text-muted-foreground">Task</TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground">Started</TableHead>
                <TableHead className="text-xs text-muted-foreground">Duration</TableHead>
                <TableHead className="text-xs text-muted-foreground pr-4">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTasks.map((task, i) => {
                const agent = agents.find(a => a.name === task.agent)
                return (
                  <TableRow key={i} className="border-border hover:bg-accent/20">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `${agent?.color ?? "#64748b"}22`, color: agent?.color ?? "#64748b" }}
                        >
                          {task.agent[0]}
                        </span>
                        <span className="text-xs font-medium" style={{ color: agent?.color ?? "#64748b" }}>{task.agent}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-foreground">{task.issue}</span></TableCell>
                    <TableCell>
                      {task.status === "success" && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="size-3" />Success</span>}
                      {task.status === "failed" && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="size-3" />Failed</span>}
                      {task.status === "running" && <span className="flex items-center gap-1 text-xs text-primary"><Loader2 className="size-3 animate-spin" />Running</span>}
                    </TableCell>
                    <TableCell><span className="text-xs font-mono text-muted-foreground">{task.started}</span></TableCell>
                    <TableCell><span className="text-xs font-mono text-muted-foreground">{task.duration}</span></TableCell>
                    <TableCell className="pr-4">
                      <span className={`text-xs font-mono ${task.status === "failed" ? "text-red-400" : task.status === "running" ? "text-primary" : "text-foreground"}`}>
                        {task.result}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
