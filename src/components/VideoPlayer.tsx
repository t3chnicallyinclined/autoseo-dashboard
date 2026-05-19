import { useState, useRef, useCallback, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Loader2 as Loader, AlertCircle } from "lucide-react"

interface VideoPlayerProps {
  src: string
  poster?: string
  aspectRatio?: string
}

export function VideoPlayer({ src, poster, aspectRatio = "16/9" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const resetState = useCallback(() => {
    setPlaying(false)
    setLoading(true)
    setError(false)
    setProgress(0)
  }, [])

  useEffect(() => {
    resetState()
  }, [src, resetState])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => setError(true))
    } else {
      v.pause()
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * v.duration
  }, [])

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowControls(true)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
    }, 2500)
  }, [])

  return (
    <div
      className="relative bg-black overflow-hidden group"
      style={{ aspectRatio }}
      onMouseMove={scheduleHide}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => { setLoading(false); setError(false) }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setPlaying(false); setProgress(0) }}
        onError={() => { setError(true); setLoading(false) }}
      />

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader className="size-8 text-white animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
          <AlertCircle className="size-8 text-red-400" />
          <span className="text-xs text-red-400">Video unavailable</span>
        </div>
      )}

      {/* Play/pause overlay (shown when paused or on hover) */}
      {!error && (
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer ${
            !playing ? "opacity-100" : showControls ? "opacity-100" : "opacity-0"
          }`}
          onClick={togglePlay}
        >
          {!playing && !loading && (
            <div className="size-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
              <Play className="size-7 text-white ml-1" fill="white" />
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      {!error && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
          {/* Progress bar */}
          <div
            className="h-1 bg-white/20 rounded-full mb-2 cursor-pointer group/bar"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {playing ? <Pause className="size-4" /> : <Play className="size-4" fill="white" />}
            </button>
            <button onClick={() => setMuted(m => !m)} className="text-white hover:text-primary transition-colors">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
