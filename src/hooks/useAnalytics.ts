import { useState, useEffect, useCallback } from "react";
import {
  analyticsApi,
  type DateRange,
  type OverviewData,
  type ViewsRow,
  type CtrRow,
  type WatchBucket,
  type ScatterPoint,
  type TopClip,
  type ShowStats,
} from "@/lib/api";

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[]): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [...deps, trigger]);

  return { data, loading, error, refetch };
}

export function useOverview(range: DateRange = "7d") {
  return useQuery<OverviewData>(() => analyticsApi.overview(range), [range]);
}

export function useViews(range: DateRange = "7d") {
  return useQuery<ViewsRow[]>(() => analyticsApi.views(range), [range]);
}

export function useCtr(range: DateRange = "7d") {
  return useQuery<CtrRow[]>(() => analyticsApi.ctr(range), [range]);
}

export function useWatchDistribution(range: DateRange = "7d") {
  return useQuery<WatchBucket[]>(() => analyticsApi.watchDistribution(range), [range]);
}

export function useScoreVsPerformance(range: DateRange = "7d") {
  return useQuery<ScatterPoint[]>(() => analyticsApi.scoreVsPerformance(range), [range]);
}

export function useTopClips(range: DateRange = "7d", limit?: number) {
  return useQuery<TopClip[]>(() => analyticsApi.topClips(range, limit), [range, limit]);
}

export function useByShow(range: DateRange = "7d") {
  return useQuery<ShowStats[]>(() => analyticsApi.byShow(range), [range]);
}
