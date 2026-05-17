import { useState, useRef, useCallback } from "react"
import { Upload, Link2, X, FileVideo, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { uploadJob, ingestDriveUrl } from "@/lib/api"

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
]

const ACCEPTED_EXTENSIONS = ".mp4,.mov,.mkv,.webm,.mp3,.wav,.flac,.ogg,.m4a"

type Mode = "upload" | "drive"

interface NewJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobCreated?: (jobId: string) => void
}

export function NewJobDialog({ open, onOpenChange, onJobCreated }: NewJobDialogProps) {
  const [mode, setMode] = useState<Mode>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [driveUrl, setDriveUrl] = useState("")
  const [showSlug, setShowSlug] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setDriveUrl("")
    setShowSlug("")
    setUploading(false)
    setUploadProgress(0)
    setError(null)
    setDragOver(false)
  }

  const handleClose = (open: boolean) => {
    if (!uploading) {
      if (!open) reset()
      onOpenChange(open)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && ACCEPTED_TYPES.includes(dropped.type)) {
      setFile(dropped)
      setError(null)
    } else {
      setError("Unsupported file type. Please use mp4, mov, mkv, webm, or audio files.")
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError(null)
    }
  }

  const isValidDriveUrl = (url: string) => {
    return /drive\.google\.com/.test(url) || /docs\.google\.com/.test(url)
  }

  const handleSubmit = async () => {
    setError(null)
    setUploading(true)

    try {
      let jobId: string

      if (mode === "upload") {
        if (!file) {
          setError("Please select a file to upload")
          setUploading(false)
          return
        }
        const result = await uploadJob(
          file,
          showSlug || undefined,
          (pct) => setUploadProgress(pct),
        )
        jobId = result.job_id
      } else {
        if (!driveUrl || !isValidDriveUrl(driveUrl)) {
          setError("Please enter a valid Google Drive URL")
          setUploading(false)
          return
        }
        const result = await ingestDriveUrl(driveUrl, showSlug || undefined)
        jobId = result.job_id
      }

      onJobCreated?.(jobId)
      handleClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">New Pipeline Job</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a video file or paste a Google Drive URL to start the clipper pipeline.
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border border-border">
          <button
            onClick={() => { setMode("upload"); setError(null) }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === "upload"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="size-3.5" />
            Upload File
          </button>
          <button
            onClick={() => { setMode("drive"); setError(null) }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === "drive"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 className="size-3.5" />
            Google Drive URL
          </button>
        </div>

        {/* Upload mode */}
        {mode === "upload" && (
          <div className="space-y-3">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="size-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your video here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse — mp4, mov, mkv, webm, audio (up to 10GB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileVideo className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setFile(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            )}

            {uploading && uploadProgress > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Uploading...</span>
                  <span className="text-xs font-mono text-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}
          </div>
        )}

        {/* Drive URL mode */}
        {mode === "drive" && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Google Drive URL</Label>
            <Input
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => { setDriveUrl(e.target.value); setError(null) }}
              className="text-sm bg-accent/50 border-border"
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              File must be shared or accessible to the service account.
            </p>
          </div>
        )}

        {/* Show selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Show (optional)</Label>
          <Select value={showSlug} onValueChange={setShowSlug} disabled={uploading}>
            <SelectTrigger className="bg-accent/50 border-border text-sm">
              <SelectValue placeholder="Auto-detect from filename" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Auto-detect</SelectItem>
              {shows.map((show) => (
                <SelectItem key={show.id} value={show.slug}>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ background: show.color }}
                    />
                    {show.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={uploading}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={uploading || (mode === "upload" && !file) || (mode === "drive" && !driveUrl)}
            className="bg-primary hover:bg-primary/90"
          >
            {uploading ? (
              <>
                <Loader2 className="size-3 mr-1.5 animate-spin" />
                {mode === "upload" ? "Uploading..." : "Starting..."}
              </>
            ) : (
              "Start Pipeline"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
