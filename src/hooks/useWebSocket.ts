import { useEffect, useRef, useState, useCallback } from "react"

export type ConnectionStatus = "connecting" | "connected" | "disconnected"

export interface UseWebSocketOptions {
  url: string
  onMessage?: (event: MessageEvent) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket({
  url,
  onMessage,
  reconnectInterval = 3000,
  maxReconnectAttempts = Infinity,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const wsRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus("connecting")
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener("open", () => {
      setStatus("connected")
      attemptsRef.current = 0
    })

    ws.addEventListener("message", (e) => {
      onMessageRef.current?.(e)
    })

    ws.addEventListener("close", () => {
      setStatus("disconnected")
      wsRef.current = null
      if (attemptsRef.current < maxReconnectAttempts) {
        attemptsRef.current += 1
        timerRef.current = setTimeout(connect, reconnectInterval)
      }
    })

    ws.addEventListener("error", () => {
      ws.close()
    })
  }, [url, reconnectInterval, maxReconnectAttempts])

  useEffect(() => {
    connect()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: string | ArrayBufferLike | Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  return { status, send }
}
