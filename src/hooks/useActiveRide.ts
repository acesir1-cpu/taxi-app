import { useQuery } from '@tanstack/react-query'
import { getActiveRide } from '../services/rideApi'

export function useActiveRide(profileId: string | undefined) {
  return useQuery({
    queryKey: ['activeRide', profileId],
    queryFn: () => getActiveRide(profileId!),
    enabled: !!profileId,
    refetchInterval: 4000,
  })
}
