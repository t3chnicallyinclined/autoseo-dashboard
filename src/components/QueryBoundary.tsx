import type { UseQueryResult } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useEffect } from "react"

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => React.ReactNode
  skeleton?: React.ReactNode
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 flex-1 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

export function QueryBoundary<T>({ query, children, skeleton }: QueryBoundaryProps<T>) {
  const { data, isLoading, error } = query

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load data: ${error.message}`)
    }
  }, [error])

  if (isLoading) {
    return <>{skeleton ?? <DefaultSkeleton />}</>
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground mb-2">Failed to load data</p>
        <p className="text-xs text-red-400 font-mono">{error?.message ?? "No data"}</p>
        <button
          onClick={() => query.refetch()}
          className="mt-3 px-3 py-1.5 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return <>{children(data)}</>
}

interface MultiQueryBoundaryProps {
  queries: UseQueryResult<unknown>[]
  children: () => React.ReactNode
  skeleton?: React.ReactNode
}

export function MultiQueryBoundary({ queries, children, skeleton }: MultiQueryBoundaryProps) {
  const isLoading = queries.some(q => q.isLoading)
  const error = queries.find(q => q.error)?.error as Error | undefined

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load data: ${error.message}`)
    }
  }, [error])

  if (isLoading) {
    return <>{skeleton ?? <DefaultSkeleton />}</>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground mb-2">Failed to load data</p>
        <p className="text-xs text-red-400 font-mono">{error.message}</p>
        <button
          onClick={() => queries.forEach(q => q.refetch())}
          className="mt-3 px-3 py-1.5 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return <>{children()}</>
}
