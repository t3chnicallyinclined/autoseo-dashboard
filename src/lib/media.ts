const API_BASE = import.meta.env.VITE_API_BASE ?? ""

export type VideoVariant = "vertical" | "square" | "landscape"

const FORMAT_TO_VARIANT: Record<string, VideoVariant> = {
  "9:16": "vertical",
  "1:1": "square",
  "16:9": "landscape",
}

export function videoUrl(jobId: string, clipId: string, variant: VideoVariant): string {
  return `${API_BASE}/api/media/video/${jobId}/${clipId}/${variant}`
}

export function thumbUrl(jobId: string, clipId: string): string {
  return `${API_BASE}/api/media/thumb/${jobId}/${clipId}`
}

export function formatToVariant(format: string): VideoVariant {
  return FORMAT_TO_VARIANT[format] ?? "vertical"
}
