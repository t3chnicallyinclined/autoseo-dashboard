import { useState } from "react"
import {
  LayoutDashboard, Film, Inbox, ChartBar as BarChart2, MoreHorizontal,
  Workflow, Grid3x3, Share2, CreditCard as Edit3, CalendarDays,
  TrendingUp, Brain, Tv, Bot, Settings, X, Plus
} from "lucide-react"

interface MobileBottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const primaryItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { label: "Clips", icon: Film, page: "clips" },
  { label: "Jobs", icon: Inbox, page: "jobs" },
  { label: "Analytics", icon: BarChart2, page: "analytics" },
]

const allItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { label: "Pipeline", icon: Workflow, page: "pipeline" },
  { label: "Jobs", icon: Inbox, page: "jobs" },
  { label: "Clips", icon: Film, page: "clips" },
  { label: "Library", icon: Grid3x3, page: "library" },
  { label: "Platforms", icon: Share2, page: "platforms" },
  { label: "Social Copy", icon: Edit3, page: "social-copy" },
  { label: "Schedule", icon: CalendarDays, page: "schedule" },
  { label: "Analytics", icon: BarChart2, page: "analytics" },
  { label: "Trends", icon: TrendingUp, page: "trends" },
  { label: "Ranker", icon: Brain, page: "ranker" },
  { label: "Shows", icon: Tv, page: "shows" },
  { label: "Agents", icon: Bot, page: "agents" },
  { label: "Settings", icon: Settings, page: "settings" },
]

export function MobileBottomNav({ currentPage, onNavigate }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)

  const handleNavigate = (page: string) => {
    onNavigate(page)
    setMoreOpen(false)
  }

  const isMoreActive = !primaryItems.some(item => item.page === currentPage)

  return (
    <>
      {/* More menu - full screen slide-up */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <button
              onClick={() => setMoreOpen(false)}
              className="size-10 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {allItems.map(item => (
                <button
                  key={item.page}
                  onClick={() => handleNavigate(item.page)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors min-h-[80px] ${
                    currentPage === item.page
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <item.icon className="size-6" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB - New Job */}
      <button
        onClick={() => handleNavigate("jobs")}
        className="fixed bottom-[72px] right-4 z-40 size-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform md:hidden"
      >
        <Plus className="size-6" />
      </button>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-14 bg-card border-t border-border flex items-center justify-around px-2 md:hidden safe-area-bottom">
        {primaryItems.map(item => (
          <button
            key={item.page}
            onClick={() => handleNavigate(item.page)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-lg transition-colors ${
              currentPage === item.page
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] rounded-lg transition-colors ${
            isMoreActive
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal className="size-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  )
}
