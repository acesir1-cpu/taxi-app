import type { AppNotification } from '../types/domain'

export type NotificationIconCategory = 'ride' | 'driver' | 'payment'

/** Maps stored notification data to ride / driver / payment icon treatment. */
export function notificationIconCategory(n: AppNotification): NotificationIconCategory {
  if (n.type === 'payment') return 'payment'
  if (n.titleKey === 'inboxDriver') return 'driver'
  if (
    n.titleKey === 'inboxRide' ||
    n.titleKey === 'inboxRating' ||
    n.type === 'driverRideSummary' ||
    n.type === 'rating'
  ) {
    return 'ride'
  }
  if (n.type === 'ride') return 'ride'
  return 'driver'
}
