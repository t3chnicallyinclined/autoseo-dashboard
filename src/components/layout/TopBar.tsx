import { useState } from "react"
import { Bell, Search, ChevronRight, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Zap, X } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

const notifications = [
  { id: 1, type: "success", title: "Clip posted to YouTube", desc: "This changes everything about AI regulation", time: "2m ago" },
  { id: 2, type: "success", title: "Job completed", desc: "JRE #2247 — 12 clips generated", time: "15m ago" },
  { id: 3, type: "error", title: "Post failed on Bluesky", desc: "The real reason I left the company", time: "22m ago" },
  { id: 4, type: "info", title: "Trending topic matched", desc: "'AI Regulation' matched 3 clips", time: "1h ago" },
  { id: 5, type: "warning", title: "Cost alert", desc: "Daily spend approaching threshold", time: "3h ago" },
]

const pageTitles: Record<string, string[]> = {
  dashboard: ["Dashboard"],
  pipeline: ["Pipeline"],
  jobs: ["Content", "Jobs"],
  clips: ["Content", "Clips"],
  library: ["Content", "Library"],
  platforms: ["Distribution", "Platforms"],
  "social-copy": ["Distribution", "Social Copy"],
  schedule: ["Distribution", "Schedule"],
  analytics: ["Intelligence", "Analytics"],
  trends: ["Intelligence", "Trends"],
  ranker: ["Intelligence", "Ranker"],
  shows: ["Configuration", "Shows"],
  agents: ["Configuration", "Agents"],
  settings: ["Configuration", "Settings"],
}

interface TopBarProps {
  currentPage: string
  onOpenSearch: () => void
}

export function TopBar({ currentPage, onOpenSearch }: TopBarProps) {
  const [dismissed, setDismissed] = useState<number[]>([])
  const breadcrumbs = pageTitles[currentPage] ?? [currentPage]
  const activeNotifications = notifications.filter(n => !dismissed.includes(n.id))

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0 sticky top-0 z-20">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
            <span className={i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 h-8 px-3 text-muted-foreground border-border bg-accent/50 hover:bg-accent text-xs"
      >
        <Search className="size-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 h-4 px-1 rounded bg-muted text-xs font-mono">⌘K</kbd>
      </Button>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground hover:text-foreground">
            <Bell className="size-4" />
            {activeNotifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                {activeNotifications.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 bg-popover border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            <Badge variant="secondary" className="text-xs">{activeNotifications.length} new</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {activeNotifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">All caught up!</div>
            ) : (
              activeNotifications.map(n => (
                <div key={n.id} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0">
                  {n.type === "success" && <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />}
                  {n.type === "error" && <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />}
                  {n.type === "info" && <Zap className="size-4 text-blue-500 mt-0.5 shrink-0" />}
                  {n.type === "warning" && <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{n.time}</p>
                  </div>
                  <button
                    onClick={() => setDismissed(d => [...d, n.id])}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* User avatar */}
      <div className="size-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
        AS
      </div>
    </header>
  )
}
