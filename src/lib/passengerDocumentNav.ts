import type { ExternalDocumentType } from '../types/reports'
import type { Ride, RideStatus } from '../types/domain'

export type PassengerDocumentNavState = {
  returnTo?: string
}

const ACTIVE_PASSENGER_RIDE_STATUSES: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku']

export function isActivePassengerRide(status: RideStatus): boolean {
  return ACTIVE_PASSENGER_RIDE_STATUSES.includes(status)
}

export function resolvePassengerDocumentBackPath(
  type: ExternalDocumentType,
  entityId: string,
  ride: Ride | null | undefined
): string {
  if (type === 'booking_confirmation') return '/app/scheduled'
  if (ride && isActivePassengerRide(ride.status)) return `/app/ride/${entityId}`
  if (type === 'invoice') {
    return ride?.status === 'zavrsena' ? `/app/history/${entityId}` : `/app/rate/${entityId}`
  }
  return `/app/history/${entityId}`
}
