import { useState } from "react"
import { Upload, Link as LinkIcon, Loader as Loader2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type Source = "file" | "url"

interface NewJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (id: string) => void
}

export function NewJobDialog({ open, onOpenChange, onCreated }: NewJobDialogProps) {
  const [source, setSource] = useState<Source>("file")
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [mediaName, setMediaName] = useState("")
  const [showSlug, setShowSlug] = useState("")
  const [topK, setTopK] = useState("5")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null); setUrl(""); setMediaName(""); setShowSlug(""); setTopK("5")
    setProgress(0); setError(null); setBusy(false)
  }

  const handleClose = () => { if (!busy) { reset(); onOpenChange(false) } }

  const canSubmit = !busy && (source === "file" ? !!file : url.trim().length > 0)

  const submit = async () => {
    setError(null)
    setBusy(true)
    setProgress(0)
    try {
      const configJson = JSON.stringify({
        clip_top_k: parseInt(topK || "5", 10) || 5,
      })

      if (source === "url") {
        const body = {
          video_url: url.trim(),
          media_name: mediaName.trim() || undefined,
          show_slug: showSlug.trim() || undefined,
          config: JSON.parse(configJson),
        }
        const resp = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!resp.ok) {
          const t = await resp.text().catch(() => `${resp.status} ${resp.statusText}`)
          throw new Error(t || `${resp.status}`)
        }
        const data = await resp.json()
        onCreated?.(data.id)
        reset()
        onOpenChange(false)
        return
      }

      // file upload — use XHR for progress events; fetch doesn't expose upload progress
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append("file", file as File)
      if (mediaName.trim()) fd.append("media_name", mediaName.trim())
      if (showSlug.trim()) fd.append("show_slug", showSlug.trim())
      fd.append("config_json", configJson)

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              onCreated?.(data.id)
              resolve()
            } catch { reject(new Error("invalid server response")) }
          } else {
            reject(new Error(xhr.responseText || `HTTP ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error("network error"))
        xhr.open("POST", "/api/jobs")
        xhr.send(fd)
      })
      reset()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>New clipper job</DialogTitle>
          <DialogDescription>
            Upload a podcast video or paste a URL — the worker picks it up and runs the pipeline.
          </DialogDescription>
        </DialogHeader>

        {/* Source toggle */}
        <div className="flex gap-2 rounded-lg p-1 bg-accent/30 border border-border">
          {(["file", "url"] as const).map(s => (
            <button
              key={s}
              onClick={() => !busy && setSource(s)}
              className={`flex-1 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1.5 ${
                source === s ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "file" ? <Upload className="size-3.5" /> : <LinkIcon className="size-3.5" />}
              {s === "file" ? "Upload file" : "From URL"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {source === "file" ? (
            <div>
              <Label className="text-xs text-muted-foreground">Video file</Label>
              <div
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f && !busy) {
                    setFile(f)
                    if (!mediaName) setMediaName(f.name)
                  }
                }}
                className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground"
              >
                {file ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">{file.name} <span className="text-muted-foreground">· {(file.size / 1_048_576).toFixed(1)} MB</span></span>
                    {!busy && (
                      <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="mb-2">Drop video here or</p>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={e => {
                        const f = e.target.files?.[0] ?? null
                        setFile(f)
                        if (f && !mediaName) setMediaName(f.name)
                      }}
                      className="text-xs text-foreground/70"
                    />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">Video URL</Label>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://drive.google.com/… or direct mp4 URL"
                className="h-8 text-xs bg-accent/50 border-border font-mono"
                disabled={busy}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Episode name (optional)</Label>
              <Input
                value={mediaName}
                onChange={e => setMediaName(e.target.value)}
                placeholder="auto"
                className="h-8 text-xs bg-accent/50 border-border"
                disabled={busy}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Show slug (optional)</Label>
              <Input
                value={showSlug}
                onChange={e => setShowSlug(e.target.value)}
                placeholder="tfatk"
                className="h-8 text-xs bg-accent/50 border-border font-mono"
                disabled={busy}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Clips to extract</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={topK}
                onChange={e => setTopK(e.target.value)}
                className="h-8 text-xs bg-accent/50 border-border font-mono"
                disabled={busy}
              />
            </div>
          </div>

          {busy && source === "file" && (
            <div className="space-y-1">
              <div className="h-1.5 bg-accent/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground text-right">{progress}%</div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 break-words">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit} className="gap-1.5 min-w-[100px]">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {busy ? "Uploading…" : "Start job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
