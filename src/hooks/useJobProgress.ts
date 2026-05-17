import { useEffect, useRef, useState, useCallback } from "react"

export interface JobProgress {
  job_id: string
  status: string
  stage: string
  progress: number
  error?: string
}

const WS_BASE = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}`

export function useJobProgress(jobIds: string[]) {
  const [updates, setUpdates] = useState<Map<string, JobProgress>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (jobIds.length === 0) return

    const ws = new WebSocket(`${WS_BASE}/ws/jobs`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", job_ids: jobIds }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as JobProgress
      setUpdates((prev) => {
        const next = new Map(prev)
        next.set(msg.job_id, msg)
        return next
      })
    }

    ws.onclose = () => {
      // Reconnect after 3s
      setTimeout(() => connect(), 3000)
    }

    return ws
  }, [jobIds])

  useEffect(() => {
    const ws = connect()
    return () => {
      ws?.close()
      wsRef.current = null
    }
  }, [connect])

  return updates
}
