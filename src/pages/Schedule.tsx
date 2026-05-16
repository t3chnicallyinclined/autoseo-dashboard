import { Clock, Play, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { clips, episodes } from "@/data/sample"

const platformColors: Record<string, string> = {
  youtube: "#ef4444",
  bluesky: "#0085ff",
  linkedin: "#0077b5",
  threads: "#888",
}

const scheduled = [
  { clipId: "c4", platform: "youtube", time: "2026-05-15 14:00", status: "scheduled" },
  { clipId: "c4", platform: "bluesky", time: "2026-05-15 14:05", status: "scheduled" },
  { clipId: "c4", platform: "threads", time: "2026-05-15 14:10", status: "scheduled" },
  { clipId: "c7", platform: "youtube", time: "2026-05-16 10:00", status: "scheduled" },
  { clipId: "c7", platform: "linkedin", time: "2026-05-16 10:00", status: "scheduled" },
]

export default function Schedule() {
  return (
    <div className="space-y-4">
      <Card className="bg-card border-border card-top-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Posting Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scheduled.map((s, i) => {
              const clip = clips.find(c => c.id === s.clipId)
              const episode = clip ? episodes.find(e => e.id === clip.episodeId) : null
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-accent/20 border border-border hover:bg-accent/40 transition-colors">
                  {clip && (
                    <img src={clip.thumbnail} alt={clip.hook} className="size-12 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{clip?.hook}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{episode?.title}</p>
                  </div>
                  <div
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{
                      background: `${platformColors[s.platform] ?? "#64748b"}22`,
                      color: platformColors[s.platform] ?? "#64748b",
                    }}
                  >
                    {s.platform.toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span className="font-mono">{s.time}</span>
                  </div>
                  <Badge className="text-xs bg-amber-500/20 text-amber-400 border-0 shrink-0">Scheduled</Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="size-6 text-emerald-400 hover:text-emerald-300">
                      <Play className="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-red-400">
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
