import type { AppMessages } from '../i18n/strings'
import { strings } from '../i18n/strings'
import { dispatchNotificationAdded } from '../lib/notificationEvents'
import { notificationDeepLink, type AppRole } from '../lib/notificationDeepLink'
import { notificationIconForType } from '../lib/notificationVisuals'
import {
  BANNER_NOTIFICATION_TYPES,
  type AppNotification,
  type NotificationIcon,
  type NotificationTargetApp,
  type NotificationType,
} from '../types/notifications'
import { useNotificationBannerStore } from '../store/notificationBannerStore'
import { delay } from './delay'
import { getDb, persist } from './mockDb'

const ALL_TYPES: NotificationType[] = [
  'RIDE_REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'RIDE_STARTED',
  'RIDE_COMPLETED',
  'RIDE_CANCELLED_BY_DRIVER',
  'RIDE_CANCELLED_BY_USER',
  'PAYMENT_PROCESSED',
  'SCHEDULED_RIDE_REMINDER',
  'SCHEDULED_RIDE_CONFIRMED',
  'SCHEDULED_RIDE_CANCELLED',
  'NEW_RIDE_OFFER',
  'RIDE_OFFER_EXPIRED',
  'PASSENGER_CANCELLED',
  'SHIFT_STARTED',
  'SHIFT_ENDED',
  'EARNINGS_SUMMARY',
  'LOW_RATING_ALERT',
  'ACCOUNT_LOGIN',
  'ACCOUNT_UPDATE',
  'PROMO_CODE',
  'SYSTEM_MESSAGE',
]

const TYPE_SET = new Set<string>(ALL_TYPES)

function isNotificationType(s: string): s is NotificationType {
  return TYPE_SET.has(s)
}

function newNotificationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function dedupeBlocksInsert(
  notifications: Array<Record<string, unknown>>,
  accountId: string,
  type: NotificationType,
  rideId: string | undefined
): boolean {
  const threshold = Date.now() - 120_000
  const rid = rideId ?? ''
  return notifications.some((raw) => {
    if (String(raw.accountId) !== accountId) return false
    if (String(raw.type ?? '') !== type) return false
    const rRide = typeof raw.rideId === 'string' ? raw.rideId : ''
    if (rRide !== rid) return false
    const ts = new Date(String(raw.createdAt ?? 0)).getTime()
    return ts >= threshold
  })
}

/** Normalize persisted row (new or legacy mock shape). */
export function migrateToAppNotification(raw: Record<string, unknown>, msg: AppMessages): AppNotification {
  const id = String(raw.id ?? newNotificationId())
  const accountId = String(raw.accountId ?? '')
  const read = Boolean(raw.read)
  const createdAt = String(raw.createdAt ?? new Date().toISOString())
  const typeStr = String(raw.type ?? 'SYSTEM_MESSAGE')

  if (
    typeof raw.title === 'string' &&
    typeof raw.body === 'string' &&
    !isNotificationType(typeStr) &&
    !raw.titleKey &&
    !raw.bodyKey
  ) {
    return {
      id,
      accountId,
      type: 'SYSTEM_MESSAGE',
      title: raw.title,
      body: raw.body,
      read,
      createdAt,
      icon: 'info',
      rideId: typeof raw.rideId === 'string' ? raw.rideId : undefined,
      targetApp: (raw.targetApp as NotificationTargetApp) ?? 'both',
    }
  }

  if (
    isNotificationType(typeStr) &&
    typeof raw.title === 'string' &&
    typeof raw.body === 'string' &&
    typeof raw.icon === 'string'
  ) {
    return {
      id,
      accountId,
      type: typeStr,
      title: raw.title,
      body: raw.body,
      read,
      createdAt,
      icon: raw.icon as NotificationIcon,
      rideId: typeof raw.rideId === 'string' ? raw.rideId : undefined,
      targetApp: (raw.targetApp as NotificationTargetApp) ?? 'both',
    }
  }

  const ni = msg.notifications
  const titleKey = raw.titleKey as string | undefined
  const bodyKey = raw.bodyKey as string | undefined
  let title = typeof raw.title === 'string' ? raw.title : ''
  let body = typeof raw.body === 'string' ? raw.body : ''
  if (titleKey && titleKey in ni) title = ni[titleKey as keyof typeof ni] as string
  if (bodyKey && bodyKey in ni) body = ni[bodyKey as keyof typeof ni] as string

  return {
    id,
    accountId,
    type: 'SYSTEM_MESSAGE',
    title: title || body || 'Obavještenje',
    body: body || title || '',
    read,
    createdAt,
    icon: 'info',
    targetApp: 'both',
  }
}

export function notificationDisplay(n: AppNotification, _msg: AppMessages): { title: string; body: string } {
  return { title: n.title, body: n.body }
}

export interface AppendNotificationInput {
  accountId: string
  type: NotificationType
  title: string
  body: string
  rideId?: string
  targetApp: NotificationTargetApp
  icon?: NotificationIcon
  /** false = never show top banner for this push */
  showBanner?: boolean
}

function bannerRole(targetApp: NotificationTargetApp): AppRole {
  return targetApp === 'driver' ? 'driver' : 'passenger'
}

export async function appendNotification(input: AppendNotificationInput): Promise<AppNotification | null> {
  await delay(100)
  const db = getDb()
  if (dedupeBlocksInsert(db.notifications as unknown as Record<string, unknown>[], input.accountId, input.type, input.rideId)) {
    return null
  }

  const icon = input.icon ?? notificationIconForType(input.type)
  const n: AppNotification = {
    id: newNotificationId(),
    accountId: input.accountId,
    type: input.type,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: new Date().toISOString(),
    icon,
    rideId: input.rideId,
    targetApp: input.targetApp,
  }

  db.notifications.unshift(n)
  persist()
  dispatchNotificationAdded(input.accountId)

  const allowBanner = input.showBanner !== false && BANNER_NOTIFICATION_TYPES.has(input.type)
  if (allowBanner) {
    const role = bannerRole(input.targetApp)
    const path = notificationDeepLink(n, role)
    useNotificationBannerStore.getState().show({
      id: n.id,
      accountId: n.accountId,
      title: n.title,
      body: n.body,
      path,
      notificationType: n.type,
    })
  }

  return n
}

export async function getNotifications(accountId: string): Promise<AppNotification[]> {
  await delay()
  const db = getDb()
  const msg = strings()
  return db.notifications
    .filter((n) => n.accountId === accountId)
    .map((n) => migrateToAppNotification(n as unknown as Record<string, unknown>, msg))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function markNotificationRead(notificationId: string, accountId: string): Promise<void> {
  await delay(80)
  const db = getDb()
  const n = db.notifications.find((x) => x.id === notificationId && x.accountId === accountId)
  if (n) {
    n.read = true
    persist()
  }
}

export async function markAllRead(accountId: string): Promise<void> {
  await delay(80)
  const db = getDb()
  for (const n of db.notifications) {
    if (n.accountId === accountId) n.read = true
  }
  persist()
}

export async function deleteNotification(notificationId: string, accountId: string): Promise<void> {
  await delay(80)
  const db = getDb()
  db.notifications = db.notifications.filter((n) => !(n.id === notificationId && n.accountId === accountId))
  persist()
}

export async function deleteAllNotifications(accountId: string): Promise<void> {
  await delay(80)
  const db = getDb()
  db.notifications = db.notifications.filter((n) => n.accountId !== accountId)
  persist()
}

