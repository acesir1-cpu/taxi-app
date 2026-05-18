import { AlertTriangle, Calendar, Car, Info, User, Wallet } from 'lucide-react'
import type { AppNotification, NotificationIcon, NotificationType } from '../types/notifications'

export function notificationIconForType(type: NotificationType): NotificationIcon {
  switch (type) {
    case 'PAYMENT_PROCESSED':
    case 'EARNINGS_SUMMARY':
      return 'wallet'
    case 'SCHEDULED_RIDE_REMINDER':
    case 'SCHEDULED_RIDE_CONFIRMED':
    case 'SCHEDULED_RIDE_CANCELLED':
      return 'calendar'
    case 'RIDE_CANCELLED_BY_DRIVER':
    case 'RIDE_CANCELLED_BY_USER':
    case 'RIDE_OFFER_EXPIRED':
    case 'PASSENGER_CANCELLED':
    case 'LOW_RATING_ALERT':
    case 'DISPATCH_ANOMALY':
    case 'DISPATCH_RBAC_DENIED':
      return 'alert'
    case 'DISPATCH_COMPLAINT':
      return 'person'
    case 'ACCOUNT_LOGIN':
    case 'ACCOUNT_UPDATE':
    case 'PROMO_CODE':
    case 'SYSTEM_MESSAGE':
    case 'SHIFT_STARTED':
    case 'SHIFT_ENDED':
      return 'info'
    default:
      return 'car'
  }
}

const ICON_STYLES: Record<
  NotificationIcon,
  { bg: string; Icon: typeof Car; iconClass: string }
> = {
  car: { bg: '#FFF3D6', Icon: Car, iconClass: 'text-amber-800' },
  person: { bg: '#EFF6FF', Icon: User, iconClass: 'text-blue-700' },
  wallet: { bg: '#F0FDF4', Icon: Wallet, iconClass: 'text-green-700' },
  calendar: { bg: '#F5F3FF', Icon: Calendar, iconClass: 'text-violet-700' },
  alert: { bg: '#FEF2F2', Icon: AlertTriangle, iconClass: 'text-red-600' },
  info: { bg: '#F9FAFB', Icon: Info, iconClass: 'text-gray-600' },
}

export function notificationIconVisual(icon: NotificationIcon) {
  return ICON_STYLES[icon]
}

/** @deprecated Prefer notificationIconVisual(n.icon) */
export function notificationIconCategory(n: AppNotification): keyof typeof ICON_STYLES {
  return n.icon
}
