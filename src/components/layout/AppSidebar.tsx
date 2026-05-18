import { LayoutDashboard, Workflow, Inbox, Film, Grid3x3, Share2, CreditCard as Edit3, CalendarDays, ChartBar as BarChart2, TrendingUp, Brain, Tv, Bot, Settings, DollarSign, ChevronRight, Zap } from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useCostData } from "@/api/hooks"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  page: string
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: "Command Center",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
      { label: "Pipeline", icon: Workflow, page: "pipeline", badge: "2" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Jobs", icon: Inbox, page: "jobs" },
      { label: "Clips", icon: Film, page: "clips" },
      { label: "Library", icon: Grid3x3, page: "library" },
    ],
  },
  {
    title: "Distribution",
    items: [
      { label: "Platforms", icon: Share2, page: "platforms" },
      { label: "Social Copy", icon: Edit3, page: "social-copy" },
      { label: "Schedule", icon: CalendarDays, page: "schedule" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Analytics", icon: BarChart2, page: "analytics" },
      { label: "Trends", icon: TrendingUp, page: "trends" },
      { label: "Ranker", icon: Brain, page: "ranker" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Shows", icon: Tv, page: "shows" },
      { label: "Agents", icon: Bot, page: "agents" },
      { label: "Settings", icon: Settings, page: "settings" },
    ],
  },
]

interface AppSidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { data: costData } = useCostData()
  const budgetPct = costData ? (costData.total / costData.budget) * 100 : 0
  const costColor = budgetPct > 90 ? "text-red-400" : budgetPct > 75 ? "text-amber-400" : "text-emerald-400"

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <Zap className="size-4 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-foreground tracking-tight">AutoSEO</span>
            <span className="text-xs text-muted-foreground">Clipper v2.4.1</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {navSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.page}>
                    <SidebarMenuButton
                      isActive={currentPage === item.page}
                      onClick={() => onNavigate(item.page)}
                      tooltip={item.label}
                      className="cursor-pointer"
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge className="ml-auto h-4 min-w-4 px-1 text-xs bg-primary/20 text-primary border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border space-y-2">
        {/* Cost meter */}
        <div
          className="group-data-[collapsible=icon]:hidden cursor-pointer rounded-lg bg-accent/50 p-2.5 hover:bg-accent transition-colors"
          onClick={() => onNavigate("settings")}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">This month</span>
            <span className={`text-xs font-mono font-bold ml-auto ${costColor}`}>
              ${costData?.total.toFixed(2) ?? "—"}
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground/60">${costData?.dailyBurn.toFixed(2) ?? "—"}/day</span>
            <span className="text-xs text-muted-foreground/60">${costData?.budget ?? "—"} budget</span>
          </div>
        </div>
        {/* Icon mode cost */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center">
          <DollarSign className={`size-4 ${costColor}`} />
        </div>

        {/* System health */}
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 status-pulse inline-block" />
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">System Healthy</span>
          </div>
          <ChevronRight className="size-3 text-muted-foreground/40 ml-auto group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
