import { useQuery } from '@tanstack/react-query'
import { buildAiRideEstimate, type AiEstimateContext } from '../services/aiEstimateApi'
import type { Location } from '../types/domain'

export function useAiRouteEstimate(
  pickup: Location | undefined,
  destination: Location | undefined,
  context: AiEstimateContext = {},
) {
  return useQuery({
    queryKey: [
      'aiRouteEstimate',
      pickup?.id,
      destination?.id,
      context.availableDrivers,
      context.orderType,
      context.scheduledAt,
    ],
    queryFn: async () => {
      if (!pickup || !destination) return null
      const res = await buildAiRideEstimate(pickup, destination, context)
      if ('error' in res) return res
      return res
    },
    enabled: Boolean(pickup && destination),
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  })
}
