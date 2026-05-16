import { Copy, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useClips, useEpisodes } from "@/api/hooks"
import { toast } from "sonner"

const platformCopy: Record<string, { title: string; body: string; hashtags: string[] }> = {
  youtube: {
    title: "This changes everything about AI regulation",
    body: "🔥 Elon breaks down why AI regulation in 2026 is missing the point entirely. Full interview on the podcast.",
    hashtags: ["#AIRegulation", "#ElonMusk", "#JRE", "#Podcast", "#Shorts"],
  },
  bluesky: {
    title: "This changes everything about AI regulation",
    body: "Fascinating take on AI policy from the latest episode. What do you think — are we regulating the right things?",
    hashtags: ["#AI", "#Tech", "#Podcast"],
  },
  linkedin: {
    title: "AI Regulation: Are We Getting It Wrong?",
    body: "In a recent conversation, a fascinating perspective emerged on the current state of AI governance. The argument: we're focusing on the wrong risk vectors entirely. Worth watching for anyone in tech policy.",
    hashtags: ["#AI", "#Technology", "#Policy", "#FutureOfWork"],
  },
}

export default function SocialCopy() {
  const { data: clips = [], isLoading: clipsLoading, error } = useClips()
  const { data: episodes = [] } = useEpisodes()

  if (error) toast.error("Failed to load social copy data")

  if (clipsLoading || clips.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const clip = clips[0]
  const episode = episodes.find(e => e.id === clip.episodeId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 text-sm text-muted-foreground">
          Reviewing copy for: <span className="text-foreground font-medium">{clip.hook}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clip preview */}
        <Card className="bg-card border-border card-top-border">
          <CardContent className="p-4">
            <img src={clip.thumbnail} alt={clip.hook} className="w-full aspect-video object-cover rounded-lg mb-3" />
            <p className="text-xs text-muted-foreground">{episode?.title}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{clip.hook}</p>
            <div className="flex gap-2 mt-2">
              <Badge className="text-xs bg-primary/20 text-primary border-0">#{clip.rank}</Badge>
              <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-0">Score: {clip.llmScore}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Copy tabs */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Platform Copy</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="youtube">
              <TabsList className="mb-3">
                <TabsTrigger value="youtube" className="text-xs">YouTube</TabsTrigger>
                <TabsTrigger value="bluesky" className="text-xs">Bluesky</TabsTrigger>
                <TabsTrigger value="linkedin" className="text-xs">LinkedIn</TabsTrigger>
              </TabsList>
              {Object.entries(platformCopy).map(([platform, copy]) => (
                <TabsContent key={platform} value={platform} className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Title</span>
                      <button className="text-muted-foreground hover:text-foreground"><Copy className="size-3" /></button>
                    </div>
                    <div className="text-xs text-foreground bg-accent/30 rounded-lg p-2 border border-border">{copy.title}</div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Description</span>
                      <span className="text-xs text-muted-foreground">{copy.body.length}/500</span>
                    </div>
                    <Textarea
                      defaultValue={copy.body}
                      className="text-xs min-h-16 bg-accent/30 border-border resize-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Hashtags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {copy.hashtags.map(h => (
                        <Badge key={h} variant="secondary" className="text-xs h-5">{h}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90">Save</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-border gap-1.5">
                      <RefreshCw className="size-3" /> Regenerate
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
