import { useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { TopBar } from "@/components/layout/TopBar"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { CommandPalette } from "@/components/CommandPalette"
import { useIsMobile } from "@/hooks/use-mobile"
import { WebSocketProvider } from "@/contexts/WebSocketContext"
import { Toaster } from "@/components/ui/sonner"
import SetupWizard from "@/pages/SetupWizard"
import { isSetupNeeded } from "@/hooks/use-config"
import Dashboard from "@/pages/Dashboard"
import Pipeline from "@/pages/Pipeline"
import Jobs from "@/pages/Jobs"
import Clips from "@/pages/Clips"
import Library from "@/pages/Library"
import Platforms from "@/pages/Platforms"
import SocialCopy from "@/pages/SocialCopy"
import Schedule from "@/pages/Schedule"
import Analytics from "@/pages/Analytics"
import Trends from "@/pages/Trends"
import Ranker from "@/pages/Ranker"
import Shows from "@/pages/Shows"
import Agents from "@/pages/Agents"
import Settings from "@/pages/Settings"

type Page =
  | "dashboard" | "pipeline"
  | "jobs" | "clips" | "library"
  | "platforms" | "social-copy" | "schedule"
  | "analytics" | "trends" | "ranker"
  | "shows" | "agents" | "settings"

function PageContent({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  switch (page) {
    case "dashboard": return <Dashboard onNavigate={p => onNavigate(p as Page)} />
    case "pipeline": return <Pipeline />
    case "jobs": return <Jobs />
    case "clips": return <Clips />
    case "library": return <Library />
    case "platforms": return <Platforms />
    case "social-copy": return <SocialCopy />
    case "schedule": return <Schedule />
    case "analytics": return <Analytics />
    case "trends": return <Trends />
    case "ranker": return <Ranker />
    case "shows": return <Shows />
    case "agents": return <Agents />
    case "settings": return <Settings />
    default: return <Dashboard onNavigate={p => onNavigate(p as Page)} />
  }
}

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")
  const [commandOpen, setCommandOpen] = useState(false)
  const isMobile = useIsMobile()
  const [showWizard, setShowWizard] = useState(() => isSetupNeeded())

  const navigate = (page: Page) => setCurrentPage(page)

  if (showWizard) {
    return (
      <SetupWizard onComplete={() => {
        setShowWizard(false)
        setCurrentPage("pipeline")
      }} />
    )
  }

  return (
    <WebSocketProvider>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="flex min-h-svh w-full bg-background">
          {!isMobile && (
            <AppSidebar currentPage={currentPage} onNavigate={p => navigate(p as Page)} />
          )}
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <TopBar currentPage={currentPage} onOpenSearch={() => setCommandOpen(true)} />
            <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isMobile ? "pb-20" : ""}`}>
              <PageContent page={currentPage} onNavigate={navigate} />
            </main>
          </SidebarInset>
        </div>
        {isMobile && (
          <MobileBottomNav currentPage={currentPage} onNavigate={p => navigate(p as Page)} />
        )}
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onNavigate={p => navigate(p as Page)}
        />
      </SidebarProvider>
      <Toaster position="bottom-right" richColors />
    </WebSocketProvider>
  )
}

export default App
