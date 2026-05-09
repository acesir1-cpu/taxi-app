export type NotificationTargetApp = 'passenger' | 'driver' | 'both'

export type NotificationType =
  | 'RIDE_REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'RIDE_CANCELLED_BY_DRIVER'
  | 'RIDE_CANCELLED_BY_USER'
  | 'PAYMENT_PROCESSED'
  | 'SCHEDULED_RIDE_REMINDER'
  | 'SCHEDULED_RIDE_CONFIRMED'
  | 'SCHEDULED_RIDE_CANCELLED'
  | 'NEW_RIDE_OFFER'
  | 'RIDE_OFFER_EXPIRED'
  | 'PASSENGER_CANCELLED'
  | 'SHIFT_STARTED'
  | 'SHIFT_ENDED'
  | 'EARNINGS_SUMMARY'
  | 'LOW_RATING_ALERT'
  | 'ACCOUNT_LOGIN'
  | 'ACCOUNT_UPDATE'
  | 'PROMO_CODE'
  | 'SYSTEM_MESSAGE'

export type NotificationIcon = 'car' | 'person' | 'wallet' | 'calendar' | 'alert' | 'info'

export interface AppNotification {
  id: string
  accountId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  icon: NotificationIcon
  rideId?: string
  targetApp: NotificationTargetApp
}

export const BANNER_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVED',
  'RIDE_COMPLETED',
  'PASSENGER_CANCELLED',
  'NEW_RIDE_OFFER',
])
