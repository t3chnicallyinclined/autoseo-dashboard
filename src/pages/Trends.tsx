import { RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useTrends } from "@/api/hooks"
import { QueryBoundary } from "@/components/QueryBoundary"

function TrendsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function Trends() {
  const trendsQuery = useTrends()

  return (
    <QueryBoundary query={trendsQuery} skeleton={<TrendsSkeleton />}>
      {(trendingTopics) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Real-time signals feeding the AI ranker</p>
            <Button variant="outline" size="sm" className="h-7 text-xs border-border gap-1.5">
              <RefreshCw className="size-3" /> Refresh All
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* GDELT */}
            <Card className="bg-card border-border card-top-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">GDELT News</CardTitle>
                  <div className="text-xs text-muted-foreground">14m ago · 15min refresh</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingTopics.gdelt.map((t, i) => (
                  <div key={t.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground/60 w-4 shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium text-foreground truncate">{t.topic}</span>
                        {t.matched > 0 && (
                          <Badge className="text-xs h-4 px-1.5 bg-primary/20 text-primary border-0 shrink-0">
                            {t.matched} clip{t.matched > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{t.score.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${t.score * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="h-3 w-12 rounded-sm overflow-hidden"
                          style={{
                            background: `linear-gradient(to right, ${t.tone < 0 ? "#ef4444" : "#22c55e"}33, ${t.tone < 0 ? "#ef4444" : "#22c55e"}88)`,
                          }}
                        />
                        <span className="text-xs font-mono text-muted-foreground/60">{t.sources.toLocaleString()} src</span>
                      </div>
                    </div>
                    {i < trendingTopics.gdelt.length - 1 && <Separator className="mt-1" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Reddit */}
            <Card className="bg-card border-border card-top-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Reddit Hot</CardTitle>
                  <div className="text-xs text-muted-foreground">1h refresh</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingTopics.reddit.map((t, i) => (
                  <div key={t.title} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-muted-foreground/60 w-4 shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{t.subreddit}</Badge>
                          <span className="text-xs text-muted-foreground">{(t.score / 1000).toFixed(1)}k</span>
                          <span className="text-xs text-muted-foreground">{(t.comments / 1000).toFixed(1)}k comments</span>
                        </div>
                      </div>
                    </div>
                    {i < trendingTopics.reddit.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Google Trends */}
            <Card className="bg-card border-border card-top-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Google Trends</CardTitle>
                  <div className="text-xs text-muted-foreground">Daily refresh</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingTopics.google.map((t, i) => (
                  <div key={t.term} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground/60 w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground truncate flex-1">{t.term}</span>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{(t.volume / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="ml-6 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/70"
                        style={{ width: `${(t.volume / 1300000) * 100}%` }}
                      />
                    </div>
                    <div className="ml-6 flex flex-wrap gap-1">
                      {t.related.map(r => (
                        <span key={r} className="text-[10px] bg-muted/50 text-muted-foreground rounded px-1.5 py-0.5 border border-border">{r}</span>
                      ))}
                    </div>
                    {i < trendingTopics.google.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Trend-Clip Correlation */}
          <Card className="bg-card border-border card-top-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Trend-Clip Correlation</CardTitle>
              <p className="text-xs text-muted-foreground">Impact of trend injection on clip performance</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-xs">
                <div className="text-muted-foreground font-medium">Trend</div>
                <div className="text-muted-foreground font-medium">Source</div>
                <div className="text-muted-foreground font-medium">Matched Clips</div>
                <div className="text-muted-foreground font-medium">Avg Views</div>
                <div className="text-muted-foreground font-medium">Lift vs Baseline</div>
              </div>
              <Separator className="my-2" />
              {[
                { trend: "AI Regulation", source: "GDELT", clips: 3, views: "184k", lift: "+142%" },
                { trend: "SpaceX Starship", source: "Google", clips: 2, views: "121k", lift: "+98%" },
                { trend: "OpenAI GPT-5", source: "Reddit", clips: 4, views: "92k", lift: "+74%" },
                { trend: "Federal Reserve", source: "GDELT", clips: 1, views: "45k", lift: "+28%" },
              ].map(row => (
                <div key={row.trend} className="grid grid-cols-5 gap-4 text-xs py-2 border-b border-border/50 last:border-0">
                  <span className="text-foreground font-medium">{row.trend}</span>
                  <Badge variant="secondary" className="h-4 text-[10px] px-1.5 w-fit">{row.source}</Badge>
                  <span className="font-mono text-foreground">{row.clips}</span>
                  <span className="font-mono text-foreground">{row.views}</span>
                  <span className="font-mono text-emerald-400">{row.lift}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </QueryBoundary>
  )
}
