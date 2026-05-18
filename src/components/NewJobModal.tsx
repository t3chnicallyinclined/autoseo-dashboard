import { useState, useCallback, useRef } from "react"
import { Upload, Link, Loader2, FileVideo, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { shows } from "@/data/sample"
import { createJobWithFile, createJobWithDriveUrl } from "@/lib/api"

type Mode = "upload" | "drive"

interface NewJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobCreated?: (jobId: string) => void
}

const DRIVE_URL_PATTERN = /^https:\/\/(drive\.google\.com|docs\.google\.com)\//

export function NewJobModal({ open, onOpenChange, onJobCreated }: NewJobModalProps) {
  const [mode, setMode] = useState<Mode>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [driveUrl, setDriveUrl] = useState("")
  const [showId, setShowId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setDriveUrl("")
    setShowId("")
    setUploading(false)
    setProgress(0)
    setError(null)
    setDragOver(false)
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped)
      setError(null)
    } else {
      setError("Please drop a video file (.mp4, .mkv, .mov, .webm)")
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError(null)
    }
  }

  const canSubmit = showId && (mode === "upload" ? !!file : DRIVE_URL_PATTERN.test(driveUrl))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      let result
      if (mode === "upload" && file) {
        result = await createJobWithFile(file, showId, setProgress)
      } else {
        result = await createJobWithDriveUrl(driveUrl, showId)
      }
      onJobCreated?.(result.id)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job")
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Pipeline Job</DialogTitle>
          <DialogDescription>
            Upload a video file or paste a Google Drive link to start processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              type="button"
              onClick={() => { setMode("upload"); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Upload className="size-3.5" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => { setMode("drive"); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "drive" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Link className="size-3.5" /> Drive URL
            </button>
          </div>

          {/* Upload zone */}
          {mode === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center gap-2">
                  <FileVideo className="size-5 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground truncate max-w-[240px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="p-0.5 rounded hover:bg-muted"
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a video or <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60">.mp4, .mkv, .mov, .webm</p>
                </>
              )}
            </div>
          )}

          {/* Drive URL input */}
          {mode === "drive" && (
            <div className="space-y-2">
              <Label htmlFor="drive-url" className="text-xs">Google Drive URL</Label>
              <Input
                id="drive-url"
                placeholder="https://drive.google.com/file/d/..."
                value={driveUrl}
                onChange={(e) => { setDriveUrl(e.target.value); setError(null) }}
                className="text-sm"
              />
              {driveUrl && !DRIVE_URL_PATTERN.test(driveUrl) && (
                <p className="text-xs text-amber-500">Enter a valid Google Drive URL</p>
              )}
            </div>
          )}

          {/* Show selector */}
          <div className="space-y-2">
            <Label className="text-xs">Show</Label>
            <Select value={showId} onValueChange={setShowId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a show..." />
              </SelectTrigger>
              <SelectContent>
                {shows.map((show) => (
                  <SelectItem key={show.id} value={show.id}>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: show.color }} />
                      {show.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{mode === "upload" ? "Uploading..." : "Creating job..."}</span>
                {mode === "upload" && <span>{progress}%</span>}
              </div>
              <Progress value={mode === "upload" ? progress : undefined} className="h-1.5" />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || uploading}
            className="gap-1.5"
          >
            {uploading ? (
              <><Loader2 className="size-3.5 animate-spin" /> Processing...</>
            ) : (
              "Start Pipeline"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
