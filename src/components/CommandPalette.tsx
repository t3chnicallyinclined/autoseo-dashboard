import { useEffect } from "react"
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command"
import { LayoutDashboard, Workflow, Inbox, Film, Grid3x3, Share2, CreditCard as Edit3, CalendarDays, ChartBar as BarChart2, TrendingUp, Brain, Tv, Bot, Settings } from "lucide-react"

const pages = [
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

const actions = [
  { label: "Retry all failed jobs", page: "jobs" },
  { label: "View top clip", page: "clips" },
  { label: "Check platform health", page: "platforms" },
  { label: "Open cost settings", page: "settings" },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (page: string) => void
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const handleSelect = (page: string) => {
    onNavigate(page)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command Palette" description="Search pages and actions">
      <CommandInput placeholder="Search pages, clips, jobs..." className="text-sm" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map(p => (
            <CommandItem
              key={p.page}
              value={p.label}
              onSelect={() => handleSelect(p.page)}
              className="gap-2 text-sm cursor-pointer"
            >
              <p.icon className="size-4 text-muted-foreground" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          {actions.map(a => (
            <CommandItem
              key={a.label}
              value={a.label}
              onSelect={() => handleSelect(a.page)}
              className="text-sm cursor-pointer"
            >
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
