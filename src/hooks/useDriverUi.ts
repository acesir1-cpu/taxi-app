import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DISPATCH_UPDATED_EVENT } from '../services/dispatcherApi'
import { fetchDriverUi } from '../services/driverSessionApi'

export function useDriverUi(accountId: string | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!accountId) return
    const onFleetSync = () => {
      void qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    }
    window.addEventListener(DISPATCH_UPDATED_EVENT, onFleetSync)
    return () => window.removeEventListener(DISPATCH_UPDATED_EVENT, onFleetSync)
  }, [accountId, qc])

  return useQuery({
    queryKey: ['driverUi', accountId],
    queryFn: () => fetchDriverUi(accountId!),
    enabled: !!accountId,
  })
}
