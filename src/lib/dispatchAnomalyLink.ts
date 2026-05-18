import type { DispatchAnomaly } from '../services/dispatcherApi'

/** In-app path for a dispatch anomaly row. */
export function dispatchAnomalyLink(item: DispatchAnomaly): string {
  if (item.rideId) return `/dispatch/rides/${item.rideId}`
  if (item.requestId) return `/dispatch/rides/${item.requestId}`
  if (item.complaintId) return '/dispatch/problems'
  if (item.driverId) return '/dispatch/drivers'
  return '/dispatch/problems'
}
