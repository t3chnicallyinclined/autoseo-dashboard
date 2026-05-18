import { useQuery } from "@tanstack/react-query"
import { fetchers } from "./client"
import type {
  Show,
  Episode,
  Clip,
  Job,
  Platform,
  TrendingTopics,
  Agent,
  CostData,
  AnalyticsData,
  PipelineStage,
} from "./types"

export function useShows() {
  return useQuery({
    queryKey: ["shows"],
    queryFn: fetchers.getShows as () => Promise<Show[]>,
  })
}

export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: fetchers.getEpisodes as () => Promise<Episode[]>,
  })
}

export function useClips() {
  return useQuery({
    queryKey: ["clips"],
    queryFn: fetchers.getClips as () => Promise<Clip[]>,
  })
}

export function useClip(id: string) {
  return useQuery({
    queryKey: ["clips", id],
    queryFn: () => fetchers.getClip(id) as Promise<Clip>,
    enabled: !!id,
  })
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: fetchers.getJobs as () => Promise<Job[]>,
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => fetchers.getJob(id) as Promise<Job>,
    enabled: !!id,
  })
}

export function usePlatforms() {
  return useQuery({
    queryKey: ["platforms"],
    queryFn: fetchers.getPlatforms as () => Promise<Platform[]>,
  })
}

export function useTrends() {
  return useQuery({
    queryKey: ["trends"],
    queryFn: fetchers.getTrends as () => Promise<TrendingTopics>,
  })
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: fetchers.getAgents as () => Promise<Agent[]>,
    refetchInterval: 5000,
  })
}

export function useCostData() {
  return useQuery({
    queryKey: ["cost"],
    queryFn: fetchers.getCostData as () => Promise<CostData>,
    refetchInterval: 30000,
  })
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: fetchers.getAnalytics as () => Promise<AnalyticsData>,
  })
}

export function usePipelineStatus() {
  return useQuery({
    queryKey: ["pipeline-status"],
    queryFn: fetchers.getPipelineStatus as () => Promise<PipelineStage[]>,
    refetchInterval: 5000,
  })
}
