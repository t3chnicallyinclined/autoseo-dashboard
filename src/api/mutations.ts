import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./client"
import { toast } from "sonner"
import type { Clip, Job } from "./types"

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { media: string; showId: string; driveUrl?: string }) =>
      api.post<Job>("/api/jobs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] })
      toast.success("Job created")
    },
    onError: (err) => toast.error(`Failed to create job: ${err.message}`),
  })
}

export function useRetryJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => api.post<Job>(`/api/jobs/${jobId}/retry`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] })
      toast.success("Job retrying")
    },
    onError: (err) => toast.error(`Failed to retry job: ${err.message}`),
  })
}

export function useUpdateClip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Clip> & { id: string }) =>
      api.patch<Clip>(`/api/clips/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clips"] })
      toast.success("Clip updated")
    },
    onError: (err) => toast.error(`Failed to update clip: ${err.message}`),
  })
}

export function usePostClip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clipId, platforms }: { clipId: string; platforms: string[] }) =>
      api.post(`/api/clips/${clipId}/post`, { platforms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clips"] })
      toast.success("Clip posted")
    },
    onError: (err) => toast.error(`Failed to post clip: ${err.message}`),
  })
}

export function useUpdateConfig() {
  return useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      api.put("/api/config", config),
    onSuccess: () => toast.success("Settings saved"),
    onError: (err) => toast.error(`Failed to save settings: ${err.message}`),
  })
}
