import { useState, useMemo, useRef, useEffect } from "react"
import { Search, Copy, Check, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useClips, useEpisodes } from "@/api/hooks"
import { MultiQueryBoundary } from "@/components/QueryBoundary"
import type { Clip, ClipSocial, ClipSocialEntry, ClipVariant } from "@/api/types"

/** Format-tab order, matches tools/serve_clips.py. */
const FORMAT_ORDER = ["9x16", "1x1", "16x9"]
function formatLabel(v: string): string {
  if (v === "9x16") return "9:16"
  if (v === "1x1") return "1:1"
  if (v === "16x9") return "16:9"
  return v
}

/** Per-platform field definitions — mirrors PLATFORM_DEFS in serve_clips.py.
 *  Each entry: which keyof ClipSocial, display label, and the list of fields
 *  to render with copy buttons. */
interface PlatformField {
  fid: string
  label: string
  fkey: keyof ClipSocialEntry
}
const PLATFORM_DEFS: { key: keyof ClipSocial; label: string; fields: PlatformField[] }[] = [
  { key: "youtube_shorts", label: "YouTube Shorts", fields: [
    { fid: "title", label: "Title", fkey: "title" },
    { fid: "description", label: "Description", fkey: "description" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
    { fid: "pinned_comment", label: "Pinned Comment", fkey: "pinned_comment" },
  ]},
  { key: "tiktok", label: "TikTok", fields: [
    { fid: "caption", label: "Caption", fkey: "caption" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
  ]},
  { key: "instagram_reels", label: "Instagram Reels", fields: [
    { fid: "caption", label: "Caption", fkey: "caption" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
  ]},
  { key: "threads", label: "Threads", fields: [
    { fid: "text", label: "Text", fkey: "text" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
  ]},
  { key: "linkedin", label: "LinkedIn", fields: [
    { fid: "post_text", label: "Post", fkey: "post_text" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
  ]},
  { key: "x", label: "X / Twitter", fields: [
    { fid: "text", label: "Text", fkey: "text" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
  ]},
  { key: "bluesky", label: "Bluesky", fields: [
    { fid: "text", label: "Text", fkey: "text" },
    { fid: "hashtags", label: "Hashtags", fkey: "hashtags" },
  ]},
]

/** Render one labeled field with a copy button. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }).catch(() => { /* swallow */ })
    }
  }
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="flex items-start gap-2">
        <pre className="flex-1 px-3 py-2 bg-accent/50 rounded text-[13px] whitespace-pre-wrap break-words text-foreground/90 font-sans">
          {value}
        </pre>
        <button
          onClick={onCopy}
          className={`px-3 py-2 text-xs rounded transition-colors h-fit whitespace-nowrap ${
            copied ? "bg-emerald-600 text-white" : "bg-accent hover:bg-accent/70 text-foreground"
          }`}
        >
          {copied ? <span className="inline-flex items-center gap-1"><Check className="size-3" /> Copied</span> : <span className="inline-flex items-center gap-1"><Copy className="size-3" /> Copy</span>}
        </button>
      </div>
    </div>
  )
}

function PlatformPanel({ entry, fields }: { entry: ClipSocialEntry | undefined; fields: PlatformField[] }) {
  if (!entry) {
    return <p className="text-sm text-muted-foreground italic px-4 py-3">No copy generated for this platform.</p>
  }
  const filled = fields
    .map(f => {
      const raw = entry[f.fkey]
      const value = Array.isArray(raw) ? raw.join(" ") : (raw ?? "")
      return { label: f.label, value: String(value) }
    })
    .filter(f => f.value !== "")
  if (filled.length === 0) {
    return <p className="text-sm text-muted-foreground italic px-4 py-3">No copy generated for this platform.</p>
  }
  return (
    <div className="px-4 py-3">
      {filled.map(f => <CopyField key={f.label} label={f.label} value={f.value} />)}
    </div>
  )
}

/** Full-width clip card matching the layout of tools/serve_clips.py. */
function ClipPanel({ clip }: { clip: Clip }) {
  // Ordered variants for the format-tab strip
  const variants: ClipVariant[] = useMemo(() => {
    const v = clip.variants ?? []
    return [...v].sort(
      (a, b) => FORMAT_ORDER.indexOf(a.variant) - FORMAT_ORDER.indexOf(b.variant),
    )
  }, [clip])

  const [variantKey, setVariantKey] = useState<string | null>(null)
  const active = variants.find(v => v.variant === variantKey) ?? variants[0]

  // Imperatively swap <video> src on variant change so we preserve playhead
  // position and play state (same trick serve_clips.py's setFormat() does).
  // Using React's `key=` would force a full remount and reset to the poster.
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = videoRef.current
    if (!v || !active?.url) return
    if (v.src === active.url || v.currentSrc === active.url) return

    const wasPlaying = !v.paused && !v.ended
    const t = v.currentTime
    v.src = active.url
    v.load()

    // Seek as soon as metadata is known, then wait for the first frame to
    // actually decode (`loadeddata`) before the browser paints it. Without
    // this two-step, a paused swap leaves the OLD decoded frame on screen
    // until the user presses play.
    const onMeta = () => {
      try {
        if (t > 0) v.currentTime = Math.min(t, v.duration || t)
      } catch { /* seek-before-load can throw */ }
    }
    const onData = () => {
      if (wasPlaying) {
        v.play().catch(() => { /* needs user gesture */ })
      } else {
        // Force a single-frame decode-and-paint so the new variant becomes
        // visible immediately while paused. play().pause() is the cheapest
        // cross-browser way to nudge the renderer.
        v.play()
          .then(() => v.pause())
          .catch(() => { /* browsers that block this leave the new src ready
                            to display on first interaction */ })
      }
    }
    v.addEventListener("loadedmetadata", onMeta, { once: true })
    v.addEventListener("loadeddata", onData, { once: true })
    return () => {
      v.removeEventListener("loadedmetadata", onMeta)
      v.removeEventListener("loadeddata", onData)
    }
  }, [active?.url])

  const [platformKey, setPlatformKey] = useState<string>(PLATFORM_DEFS[0].key)
  const activePlatform = PLATFORM_DEFS.find(p => p.key === platformKey) ?? PLATFORM_DEFS[0]
  const social = clip.social ?? undefined
  const activeEntry = social
    ? (social[activePlatform.key as keyof ClipSocial] as ClipSocialEntry | undefined)
    : undefined

  // Reasoning may be "<llm reasoning> | vlm: <vlm reasoning>" per the clipper.
  const reasoningRaw = clip.reasoning ?? ""
  let llmWhy = reasoningRaw
  let vlmWhy = ""
  if (reasoningRaw.includes(" | vlm: ")) {
    const idx = reasoningRaw.indexOf(" | vlm: ")
    llmWhy = reasoningRaw.slice(0, idx)
    vlmWhy = reasoningRaw.slice(idx + " | vlm: ".length)
  }

  const rankStr = String(clip.rank ?? 0).padStart(2, "0")

  return (
    <div
      id={`clip-${clip.rank}`}
      className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6 p-6 bg-card border border-border rounded-xl"
    >
      {/* Video column */}
      <div className="flex flex-col items-center gap-3 min-w-0">
        {active?.url ? (
          <video
            ref={videoRef}
            src={active.url}
            poster={clip.thumbnail || undefined}
            controls
            preload="metadata"
            playsInline
            className="w-full max-h-[70vh] rounded-lg bg-black"
          />
        ) : (
          <div className="w-full aspect-video rounded-lg bg-black flex items-center justify-center text-muted-foreground text-sm">
            no render
          </div>
        )}

        {/* Format-switcher tabs */}
        <div className="flex flex-wrap gap-1.5 justify-center w-full">
          {variants.map(v => {
            const isActive = active?.variant === v.variant
            const mb = v.bytes ? ` · ${(v.bytes / 1_048_576).toFixed(1)}MB` : ""
            return (
              <button
                key={v.variant}
                onClick={() => setVariantKey(v.variant)}
                className={`px-3 py-1 rounded-md text-[12px] font-mono border transition-colors ${
                  isActive
                    ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-500"
                    : "bg-accent/40 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
              >
                {formatLabel(v.variant)}{mb}
              </button>
            )
          })}
        </div>
      </div>

      {/* Info column */}
      <div className="min-w-0">
        {/* Rank / score / duration row */}
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span className="font-mono text-2xl font-semibold text-muted-foreground">#{rankStr}</span>
          <span className="px-3 py-1 rounded-md bg-gradient-to-br from-purple-500 to-purple-700 text-white font-bold text-base">
            {clip.llmScore}
          </span>
          <span className="px-2 py-0.5 rounded bg-accent/50 text-muted-foreground font-mono text-xs">
            {clip.duration}
          </span>
          <Badge variant="secondary" className="text-[10px] uppercase">{clip.status}</Badge>
        </div>

        {/* Hook */}
        <p className="text-base font-medium text-foreground mb-2 leading-snug">{clip.hook}</p>

        {/* Overlay hook callout */}
        {clip.overlayHook && (
          <div className="mb-3 px-3 py-2 rounded-md bg-orange-400/10 border-l-2 border-orange-400 text-sm">
            <span className="font-semibold">Overlay:</span> &ldquo;{clip.overlayHook}&rdquo;
            {clip.hookSource && (
              <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-orange-400/20 text-orange-300 uppercase font-mono">
                {clip.hookSource}
              </span>
            )}
          </div>
        )}

        {/* Reasoning */}
        {(llmWhy || vlmWhy) && (
          <div className="text-sm text-muted-foreground mb-4 space-y-1">
            {llmWhy && (
              <div>
                <span className="font-bold text-blue-300">LLM:</span> {llmWhy}
              </div>
            )}
            {vlmWhy && (
              <div>
                <span className="font-bold text-orange-300">VLM:</span> {vlmWhy}
              </div>
            )}
          </div>
        )}

        {/* Posts strip */}
        {Object.entries(clip.platforms).length > 0 && (
          <div className="mb-4 px-3 py-2 rounded bg-background/50 border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Posts</div>
            <div className="space-y-1">
              {Object.entries(clip.platforms).map(([p, status]) => {
                const cls =
                  status === "posted" ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/40" :
                  status === "failed" ? "bg-red-900/40 text-red-300 border-red-700/40" :
                  status === "skipped" ? "bg-muted/40 text-muted-foreground border-border" :
                  "bg-purple-900/40 text-purple-300 border-purple-700/40"
                return (
                  <div key={p} className="flex items-center gap-2 text-xs">
                    <span className={`min-w-[64px] text-center px-1.5 py-0.5 rounded font-mono text-[10px] uppercase border ${cls}`}>
                      {status}
                    </span>
                    <span className="min-w-[80px] text-foreground/90">{p}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-0.5 border-b border-border mt-2">
          {PLATFORM_DEFS.map(p => {
            const isActive = platformKey === p.key
            return (
              <button
                key={p.key}
                onClick={() => setPlatformKey(p.key)}
                className={`px-3 py-1.5 text-xs rounded-t-md border border-b-0 transition-colors ${
                  isActive
                    ? "bg-background text-foreground border-border"
                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="border border-t-0 border-border rounded-b-md rounded-tr-md bg-background/30">
          <PlatformPanel entry={activeEntry} fields={activePlatform.fields} />
        </div>
      </div>
    </div>
  )
}

function ClipsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-80 rounded-xl" />
      ))}
    </div>
  )
}

export default function Clips() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const clipsQuery = useClips()
  const episodesQuery = useEpisodes()

  return (
    <MultiQueryBoundary queries={[clipsQuery, episodesQuery]} skeleton={<ClipsSkeleton />}>
      {() => {
        const clips = clipsQuery.data!

        const filtered = clips
          .filter(c => {
            if (search && !c.hook.toLowerCase().includes(search.toLowerCase())) return false
            if (statusFilter !== "all" && c.status !== statusFilter) return false
            return true
          })
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))

        return (
          <div className="space-y-4">
            {/* Header / controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="size-4 text-yellow-500" fill="#eab308" />
                <span className="text-foreground font-medium">{filtered.length}</span>
                <span>clip{filtered.length === 1 ? "" : "s"}</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search hooks..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-accent/50 border-border"
                />
              </div>
              <div className="flex gap-1">
                {["all", "posted", "approved", "generated", "vetoed"].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Stacked clip cards */}
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-16">
                No clips match the current filter.
              </div>
            ) : (
              <div className="space-y-6">
                {filtered.map(clip => <ClipPanel key={clip.id} clip={clip} />)}
              </div>
            )}
          </div>
        )
      }}
    </MultiQueryBoundary>
  )
}
