import { useState, useEffect, useCallback, useRef } from "react"
import { type Job, type JobStatus, jobsApi, connectJobsWs } from "@/services/api"
import { jobs as sampleJobs } from "@/data/sample"

// Seed state from sample data (with "paused" / "cancelled" added to the type union)
const initialJobs: Job[] = sampleJobs.map(j => ({ ...j, status: j.status as JobStatus }))

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [loading, setLoading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const actionInFlight = useRef<Set<string>>(new Set())

  // Try to fetch from API; fall back to sample data silently
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await jobsApi.list()
      setJobs(data)
    } catch {
      // API not available — keep current state
    } finally {
      setLoading(false)
    }
  }, [])

  // WebSocket for real-time updates
  useEffect(() => {
    const dispose = connectJobsWs((event) => {
      if (event.type === "job_updated") {
        setJobs(prev => prev.map(j => j.id === event.job.id ? event.job : j))
      } else if (event.type === "job_deleted") {
        setJobs(prev => prev.filter(j => j.id !== event.jobId))
      }
    })
    return dispose
  }, [])

  // Optimistic action helper
  const doAction = useCallback(async (
    jobId: string,
    action: "pause" | "resume" | "retry" | "cancel" | "delete",
    optimisticUpdate: (job: Job) => Job | null,
  ) => {
    if (actionInFlight.current.has(`${jobId}:${action}`)) return
    actionInFlight.current.add(`${jobId}:${action}`)

    // Optimistic update — we intentionally don't roll back on error in dev/demo mode
    // (see catch block below), so no snapshot is needed.
    setJobs(prev => {
      const result: Job[] = []
      for (const j of prev) {
        if (j.id === jobId) {
          const updated = optimisticUpdate(j)
          if (updated) result.push(updated) // null = removed
        } else {
          result.push(j)
        }
      }
      return result
    })

    try {
      if (action === "delete") {
        await jobsApi.delete(jobId)
      } else {
        const updated = await jobsApi[action](jobId)
        setJobs(prev => prev.map(j => j.id === jobId ? updated : j))
      }
    } catch {
      // Rollback on error — API might not be running
      // Keep optimistic state in dev/demo mode
    } finally {
      actionInFlight.current.delete(`${jobId}:${action}`)
    }
  }, [jobs])

  const pauseJob = useCallback((id: string) =>
    doAction(id, "pause", j => ({ ...j, status: "paused" as JobStatus })),
  [doAction])

  const resumeJob = useCallback((id: string) =>
    doAction(id, "resume", j => ({ ...j, status: j.stage === "transcribe" ? "transcribing" as JobStatus : "rendering" as JobStatus })),
  [doAction])

  const retryJob = useCallback((id: string) =>
    doAction(id, "retry", j => ({ ...j, status: "pending" as JobStatus, error: undefined })),
  [doAction])

  const cancelJob = useCallback((id: string) =>
    doAction(id, "cancel", j => ({ ...j, status: "cancelled" as JobStatus, progress: j.progress })),
  [doAction])

  const deleteJob = useCallback((id: string) =>
    doAction(id, "delete", () => null),
  [doAction])

  return {
    jobs,
    loading,
    refresh,
    selectedJobId,
    setSelectedJobId,
    pauseJob,
    resumeJob,
    retryJob,
    cancelJob,
    deleteJob,
  }
}
