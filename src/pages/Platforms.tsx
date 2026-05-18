import { useEffect, useState } from "react"
import { Settings, Unlink, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Clock, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { api, type PlatformInfo } from "@/lib/api"
import { platforms as samplePlatforms } from "@/data/sample"

const statusConfig = {
  connected: { label: "Connected", icon: CheckCircle2, class: "text-emerald-400", dot: "bg-emerald-500" },
  pending: { label: "Pending Review", icon: Clock, class: "text-amber-400", dot: "bg-amber-500" },
  expired: { label: "Token Expired", icon: AlertCircle, class: "text-amber-400", dot: "bg-amber-500" },
  not_configured: { label: "Not Configured", icon: AlertCircle, class: "text-muted-foreground", dot: "bg-muted-foreground" },
}

export default function Platforms() {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>(samplePlatforms as PlatformInfo[])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPlatforms()
      .then(setPlatforms)
      .catch(() => {
        // Fall back to sample data if API unavailable
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading platforms...
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {platforms.map(platform => {
          const sc = statusConfig[platform.status as keyof typeof statusConfig] ?? statusConfig.not_configured

          return (
            <Card key={platform.id} className="bg-card border-border card-top-border overflow-hidden">
              {/* Top color accent */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${platform.color}88, ${platform.color}22)` }} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: platform.color + "22", border: `1px solid ${platform.color}44` }}
                    >
                      <span style={{ color: platform.color }}>{platform.icon}</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">{platform.name}</CardTitle>
                      {platform.handle && (
                        <p className="text-xs text-muted-foreground">{platform.handle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${sc.dot} ${platform.status === "connected" ? "status-pulse" : ""}`} />
                    <span className={`text-xs ${sc.class}`}>{sc.label}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Posts", value: platform.totalPosts.toString() },
                    { label: "Views", value: platform.totalViews > 0 ? `${(platform.totalViews / 1000).toFixed(0)}k` : "—" },
                    { label: "Avg CTR", value: platform.avgCtr > 0 ? `${platform.avgCtr}%` : "—" },
                    { label: "Watch %", value: platform.avgWatch > 0 ? `${platform.avgWatch}%` : "—" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-accent/30 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-foreground font-mono">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quota bar (YouTube only) */}
                {platform.quotaUsed !== undefined && platform.quotaTotal && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Daily Quota</span>
                      <span className="text-xs font-mono text-foreground">{platform.quotaUsed} / {platform.quotaTotal}</span>
                    </div>
                    <Progress value={(platform.quotaUsed / platform.quotaTotal) * 100} className="h-1.5" />
                  </div>
                )}

                {/* Last post */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last post</span>
                  <span className="text-foreground font-mono">{platform.lastPost}</span>
                </div>

                {/* Note */}
                {platform.note && (
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${platform.status === "expired" || platform.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-muted/30 text-muted-foreground border border-border"}`}>
                    <AlertCircle className="size-3 shrink-0" />
                    {platform.note}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    style={{
                      background: platform.status === "connected" ? `${platform.color}22` : platform.status === "expired" ? "#f59e0b22" : `${platform.color}11`,
                      color: platform.status === "connected" ? platform.color : platform.status === "expired" ? "#f59e0b" : "#64748b",
                      border: `1px solid ${platform.status === "connected" ? platform.color + "44" : platform.status === "expired" ? "#f59e0b44" : "#33333366"}`,
                    }}
                  >
                    <Settings className="size-3 mr-1.5" />
                    {platform.status === "expired" ? "Reconnect" : platform.status === "not_configured" ? "Configure" : "Settings"}
                  </Button>
                  {platform.status === "connected" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Unlink className="size-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
