import { useQuery } from '@tanstack/react-query'
import { fetchDriverUi } from '../services/driverSessionApi'

export function useDriverUi(accountId: string | undefined) {
  return useQuery({
    queryKey: ['driverUi', accountId],
    queryFn: () => fetchDriverUi(accountId!),
    enabled: !!accountId,
  })
}
