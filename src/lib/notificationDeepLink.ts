import type { AppNotification, NotificationType } from '../types/notifications'

export type AppRole = 'passenger' | 'driver'

/** Target path for in-app navigation. */
export function notificationDeepLink(n: AppNotification, role: AppRole): string {
  const r = n.rideId
  const t = n.type as NotificationType

  if (role === 'passenger') {
    if (
      r &&
      [
        'DRIVER_ASSIGNED',
        'DRIVER_EN_ROUTE',
        'DRIVER_ARRIVED',
        'RIDE_STARTED',
        'RIDE_CANCELLED_BY_DRIVER',
        'RIDE_CANCELLED_BY_USER',
        'PAYMENT_PROCESSED',
      ].includes(t)
    ) {
      return `/app/ride/${r}`
    }
    if (t === 'RIDE_COMPLETED' && r) return `/app/rate/${r}`
    if (t === 'RIDE_REQUESTED' || t === 'SCHEDULED_RIDE_CONFIRMED') return '/app/order'
    if (t === 'SCHEDULED_RIDE_REMINDER' || t === 'SCHEDULED_RIDE_CANCELLED') return '/app/scheduled'
    if (t === 'ACCOUNT_LOGIN' || t === 'ACCOUNT_UPDATE') return '/app/profile'
    return '/app/order'
  }

  if (r && (t === 'PASSENGER_CANCELLED' || t === 'RIDE_COMPLETED')) return '/driver/active'
  if (t === 'NEW_RIDE_OFFER' || t === 'RIDE_OFFER_EXPIRED') return '/driver'
  if (t === 'EARNINGS_SUMMARY') return '/driver/earnings'
  if (t === 'LOW_RATING_ALERT' || t === 'SHIFT_STARTED' || t === 'SHIFT_ENDED' || t === 'ACCOUNT_UPDATE') {
    return '/driver/settings'
  }
  if (t === 'ACCOUNT_LOGIN') return '/driver'
  return '/driver'
}
