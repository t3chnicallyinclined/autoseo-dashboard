import { createContext, useContext, useCallback, useReducer, type ReactNode } from "react"
import { useWebSocket, type ConnectionStatus } from "@/hooks/useWebSocket"
import { toast } from "sonner"

// --- Message types from the backend ---

export interface PipelineStageUpdate {
  type: "pipeline_stage"
  jobId: string
  stageId: string
  status: "done" | "active" | "idle" | "failed"
  progress?: number
}

export interface JobUpdate {
  type: "job_update"
  jobId: string
  status: string
  stage: string
  progress: number
  clipsGenerated?: number
  media?: string
}

export interface JobComplete {
  type: "job_complete"
  jobId: string
  media: string
  clipsGenerated: number
}

export interface JobFailed {
  type: "job_failed"
  jobId: string
  media: string
  error: string
}

export interface PostComplete {
  type: "post_complete"
  clipId: string
  clipHook: string
  platform: string
  status: "posted" | "failed"
}

export interface StatUpdate {
  type: "stat_update"
  activeJobs?: number
  clipsThisWeek?: number
  postsPublished?: number
  totalViews?: number
  avgCtr?: number
}

export interface CostUpdate {
  type: "cost_update"
  total: number
  dailyBurn: number
  breakdown?: { stt: number; chat: number; embeddings: number; vlm: number }
}

export interface AgentStatusUpdate {
  type: "agent_status"
  agentId: string
  status: "working" | "idle" | "error"
  currentTask?: string | null
  elapsed?: string | null
}

export type WSMessage =
  | PipelineStageUpdate
  | JobUpdate
  | JobComplete
  | JobFailed
  | PostComplete
  | StatUpdate
  | CostUpdate
  | AgentStatusUpdate

// --- Live state ---

export interface LiveState {
  pipelineStages: Record<string, { status: string; progress?: number }>
  jobs: Record<string, { status: string; stage: string; progress: number; clipsGenerated?: number }>
  stats: {
    activeJobs?: number
    clipsThisWeek?: number
    postsPublished?: number
    totalViews?: number
    avgCtr?: number
  }
  cost: { total: number; dailyBurn: number } | null
  agents: Record<string, { status: string; currentTask?: string | null; elapsed?: string | null }>
  clipPlatforms: Record<string, Record<string, string>>
}

type Action =
  | { type: "PIPELINE_STAGE"; stageId: string; status: string; progress?: number }
  | { type: "JOB_UPDATE"; jobId: string; data: { status: string; stage: string; progress: number; clipsGenerated?: number } }
  | { type: "STAT_UPDATE"; stats: Partial<LiveState["stats"]> }
  | { type: "COST_UPDATE"; cost: { total: number; dailyBurn: number } }
  | { type: "AGENT_STATUS"; agentId: string; data: { status: string; currentTask?: string | null; elapsed?: string | null } }
  | { type: "CLIP_PLATFORM"; clipId: string; platform: string; status: string }

function reducer(state: LiveState, action: Action): LiveState {
  switch (action.type) {
    case "PIPELINE_STAGE":
      return {
        ...state,
        pipelineStages: {
          ...state.pipelineStages,
          [action.stageId]: { status: action.status, progress: action.progress },
        },
      }
    case "JOB_UPDATE":
      return {
        ...state,
        jobs: { ...state.jobs, [action.jobId]: action.data },
      }
    case "STAT_UPDATE":
      return {
        ...state,
        stats: { ...state.stats, ...action.stats },
      }
    case "COST_UPDATE":
      return {
        ...state,
        cost: action.cost,
      }
    case "AGENT_STATUS":
      return {
        ...state,
        agents: { ...state.agents, [action.agentId]: action.data },
      }
    case "CLIP_PLATFORM": {
      const prev = state.clipPlatforms[action.clipId] ?? {}
      return {
        ...state,
        clipPlatforms: {
          ...state.clipPlatforms,
          [action.clipId]: { ...prev, [action.platform]: action.status },
        },
      }
    }
    default:
      return state
  }
}

const initialState: LiveState = {
  pipelineStages: {},
  jobs: {},
  stats: {},
  cost: null,
  agents: {},
  clipPlatforms: {},
}

interface WSContextValue {
  connectionStatus: ConnectionStatus
  live: LiveState
  send: (data: string | ArrayBufferLike | Blob) => void
}

const WSContext = createContext<WSContextValue | null>(null)

const WS_URL = (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__AUTOSEO_WS_URL as string)
  || import.meta.env.VITE_WS_URL
  || `ws://${window.location.hostname}:9090/ws`

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [live, dispatch] = useReducer(reducer, initialState)

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: WSMessage
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }

    switch (msg.type) {
      case "pipeline_stage":
        dispatch({ type: "PIPELINE_STAGE", stageId: msg.stageId, status: msg.status, progress: msg.progress })
        break
      case "job_update":
        dispatch({
          type: "JOB_UPDATE",
          jobId: msg.jobId,
          data: { status: msg.status, stage: msg.stage, progress: msg.progress, clipsGenerated: msg.clipsGenerated },
        })
        break
      case "job_complete":
        toast.success(`${msg.media} — ${msg.clipsGenerated} clips ready`)
        break
      case "job_failed":
        toast.error(`${msg.media} — failed: ${msg.error}`)
        break
      case "post_complete":
        if (msg.status === "posted") {
          toast.success(`${msg.clipHook} posted to ${msg.platform}`)
        } else {
          toast.error(`${msg.clipHook} failed on ${msg.platform}`)
        }
        dispatch({ type: "CLIP_PLATFORM", clipId: msg.clipId, platform: msg.platform, status: msg.status })
        break
      case "stat_update":
        dispatch({ type: "STAT_UPDATE", stats: msg })
        break
      case "cost_update":
        dispatch({ type: "COST_UPDATE", cost: { total: msg.total, dailyBurn: msg.dailyBurn } })
        break
      case "agent_status":
        dispatch({
          type: "AGENT_STATUS",
          agentId: msg.agentId,
          data: { status: msg.status, currentTask: msg.currentTask, elapsed: msg.elapsed },
        })
        break
    }
  }, [])

  const { status, send } = useWebSocket({
    url: WS_URL,
    onMessage: handleMessage,
  })

  return (
    <WSContext.Provider value={{ connectionStatus: status, live, send }}>
      {children}
    </WSContext.Provider>
  )
}

export function useWS(): WSContextValue {
  const ctx = useContext(WSContext)
  if (!ctx) throw new Error("useWS must be used within WebSocketProvider")
  return ctx
}
