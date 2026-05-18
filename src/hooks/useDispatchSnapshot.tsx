import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { DISPATCH_UPDATED_EVENT, getDispatchSnapshot, type DispatchSnapshot } from '../services/dispatcherApi'

export type DispatchSnapshotQuery = Pick<
  UseQueryResult<DispatchSnapshot, Error | null>,
  'data' | 'isPending' | 'isFetching' | 'isError' | 'error' | 'refetch'
>

const DispatchSnapshotContext = createContext<DispatchSnapshotQuery | null>(null)

function useDispatchSnapshotQuery(accountId: string | undefined): DispatchSnapshotQuery {
  const qc = useQueryClient()

  useEffect(() => {
    if (!accountId) return
    const onUpdate = () => {
      void qc.invalidateQueries({ queryKey: ['dispatchSnapshot', accountId] })
    }
    window.addEventListener(DISPATCH_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(DISPATCH_UPDATED_EVENT, onUpdate)
  }, [accountId, qc])

  return useQuery({
    queryKey: ['dispatchSnapshot', accountId],
    queryFn: () => getDispatchSnapshot(accountId!),
    enabled: !!accountId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (typeof document !== 'undefined' && document.hidden) return false
      return query.state.data ? 25_000 : false
    },
    placeholderData: (previous) => previous,
  })
}

export function DispatchSnapshotProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  const query = useDispatchSnapshotQuery(accountId)
  return <DispatchSnapshotContext.Provider value={query}>{children}</DispatchSnapshotContext.Provider>
}

export function useDispatchData(): DispatchSnapshotQuery {
  const ctx = useContext(DispatchSnapshotContext)
  if (!ctx) {
    throw new Error('useDispatchData must be used within DispatchSnapshotProvider')
  }
  return ctx
}
