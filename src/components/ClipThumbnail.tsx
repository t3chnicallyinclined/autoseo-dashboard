import { useState } from "react"
import { Film } from "lucide-react"
import { thumbUrl } from "@/lib/media"

interface ClipThumbnailProps {
  jobId: string
  clipId: string
  fallback?: string
  alt: string
  className?: string
}

export function ClipThumbnail({ jobId, clipId, fallback, alt, className = "" }: ClipThumbnailProps) {
  const [error, setError] = useState(false)
  const src = error ? fallback : thumbUrl(jobId, clipId)

  if (error && !fallback) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Film className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  )
}
