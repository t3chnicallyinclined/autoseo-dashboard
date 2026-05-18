import { Plus, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useShows, useEpisodes } from "@/api/hooks"
import { toast } from "sonner"

export default function Shows() {
  const { data: shows = [], isLoading: showsLoading, error } = useShows()
  const { data: episodes = [], isLoading: epsLoading } = useEpisodes()

  if (error) toast.error("Failed to load shows")

  if (showsLoading || epsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5">
          <Plus className="size-3" /> Add Show
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shows.map(show => {
          const showEps = episodes.filter(e => e.showId === show.id)
          return (
            <Card key={show.id} className="bg-card border-border card-top-border overflow-hidden">
              <div className="h-1" style={{ background: `linear-gradient(to right, ${show.color}88, ${show.color}22)` }} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground leading-snug">{show.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">/{show.slug}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                    <Settings className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Hosts */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hosts</p>
                  <div className="flex flex-wrap gap-1">
                    {show.hosts.map(h => (
                      <Badge key={h} variant="secondary" className="text-xs h-5">{h}</Badge>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Episodes", value: show.episodes },
                    { label: "Clips", value: show.clips },
                    { label: "Avg/Ep", value: Math.round(show.clips / show.episodes) },
                  ].map(s => (
                    <div key={s.label} className="bg-accent/30 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-foreground font-mono">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Recent episodes */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Recent Episodes</p>
                  <div className="space-y-1.5">
                    {showEps.slice(0, 2).map(ep => (
                      <div key={ep.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground truncate flex-1">{ep.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{ep.clips} clips</Badge>
                          <span className="text-muted-foreground font-mono">{ep.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicators */}
                <div className="flex items-center gap-2">
                  <Badge className="text-xs h-5 bg-emerald-500/20 text-emerald-400 border-0">Custom Prompts</Badge>
                  <Badge className="text-xs h-5 bg-primary/20 text-primary border-0">-14 LUFS</Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
