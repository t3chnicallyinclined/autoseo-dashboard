import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "./client"
import type {
  Show, Episode, Clip, Job, Platform, TrendingTopics,
  Agent, CostData, AnalyticsData, PipelineStage,
} from "./types"

// --- Query hooks ---

export function useShows() {
  return useQuery<Show[]>({
    queryKey: ["shows"],
    queryFn: () => apiFetch("/api/shows"),
  })
}

export function useEpisodes() {
  return useQuery<Episode[]>({
    queryKey: ["episodes"],
    queryFn: () => apiFetch("/api/episodes"),
  })
}

export function useClips() {
  return useQuery<Clip[]>({
    queryKey: ["clips"],
    queryFn: () => apiFetch("/api/clips"),
  })
}

export function useClip(id: string) {
  return useQuery<Clip>({
    queryKey: ["clips", id],
    queryFn: () => apiFetch(`/api/clips/${id}`),
    enabled: !!id,
  })
}

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => apiFetch("/api/jobs"),
  })
}

export function usePlatforms() {
  return useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => apiFetch("/api/platforms"),
  })
}

export function useTrends() {
  return useQuery<TrendingTopics>({
    queryKey: ["trends"],
    queryFn: () => apiFetch("/api/trends"),
  })
}

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => apiFetch("/api/agents"),
  })
}

export function useCostData() {
  return useQuery<CostData>({
    queryKey: ["costs"],
    queryFn: () => apiFetch("/api/costs"),
  })
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => apiFetch("/api/analytics"),
  })
}

export function usePipelineStages() {
  return useQuery<PipelineStage[]>({
    queryKey: ["pipeline-stages"],
    queryFn: () => apiFetch("/api/pipeline/stages"),
  })
}

// --- Mutation hooks ---

export function useApproveClip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clipId: string) =>
      apiFetch(`/api/clips/${clipId}/approve`, { method: "POST" }),
    onMutate: async (clipId) => {
      await qc.cancelQueries({ queryKey: ["clips"] })
      const prev = qc.getQueryData<Clip[]>(["clips"])
      qc.setQueryData<Clip[]>(["clips"], (old) =>
        old?.map((c) => (c.id === clipId ? { ...c, status: "approved" } : c))
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["clips"], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["clips"] }),
  })
}

export function useVetoClip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clipId: string) =>
      apiFetch(`/api/clips/${clipId}/veto`, { method: "POST" }),
    onMutate: async (clipId) => {
      await qc.cancelQueries({ queryKey: ["clips"] })
      const prev = qc.getQueryData<Clip[]>(["clips"])
      qc.setQueryData<Clip[]>(["clips"], (old) =>
        old?.map((c) => (c.id === clipId ? { ...c, status: "vetoed" } : c))
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["clips"], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["clips"] }),
  })
}

export function usePostClip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clipId, platform }: { clipId: string; platform: string }) =>
      apiFetch(`/api/clips/${clipId}/post`, {
        method: "POST",
        body: JSON.stringify({ platform }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["clips"] }),
  })
}
