import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useEpisodes, useShows } from "@/api/hooks"
import { toast } from "sonner"

export default function Library() {
  const { data: episodes = [], isLoading: epsLoading, error: epsError } = useEpisodes()
  const { data: shows = [], isLoading: showsLoading } = useShows()

  if (epsError) toast.error("Failed to load episodes")

  if (epsLoading || showsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {episodes.map(ep => {
          const show = shows.find(s => s.id === ep.showId)
          return (
            <Card key={ep.id} className="bg-card border-border card-top-border hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="h-1" style={{ background: `linear-gradient(to right, ${show?.color ?? "#3b82f6"}88, transparent)` }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-2 rounded-full shrink-0" style={{ background: show?.color ?? "#64748b" }} />
                  <span className="text-xs text-muted-foreground">{show?.name}</span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">{ep.title}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="font-mono">{ep.duration}</span>
                  <span>{ep.clips} clips</span>
                  <span>{ep.date}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
