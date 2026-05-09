import type { AppNotification } from '../types/notifications'

export type NotificationDayBucket = 'today' | 'yesterday' | 'thisWeek' | 'older'

function startOfLocalDayMs(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/** Monday 00:00 local time for the ISO week containing `d`. */
function startOfIsoWeekMs(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = x.getDay()
  const daysFromMonday = (dow + 6) % 7
  x.setDate(x.getDate() - daysFromMonday)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function notificationDayBucket(iso: string): NotificationDayBucket {
  const created = new Date(iso).getTime()
  const now = new Date()
  const todayStart = startOfLocalDayMs(now)
  const yesterdayStart = todayStart - 86400000
  if (created >= todayStart) return 'today'
  if (created >= yesterdayStart) return 'yesterday'
  const weekStart = startOfIsoWeekMs(now)
  if (created >= weekStart && created < yesterdayStart) return 'thisWeek'
  return 'older'
}

export function groupNotificationsByDay(
  items: AppNotification[]
): Record<NotificationDayBucket, AppNotification[]> {
  const r: Record<NotificationDayBucket, AppNotification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  }
  for (const n of items) {
    r[notificationDayBucket(n.createdAt)].push(n)
  }
  return r
}

export function takeGroupedNotifications(
  items: AppNotification[],
  maxItems: number
): Array<{ bucket: NotificationDayBucket; items: AppNotification[] }> {
  const grouped = groupNotificationsByDay(items)
  const order: NotificationDayBucket[] = ['today', 'yesterday', 'thisWeek', 'older']
  const out: Array<{ bucket: NotificationDayBucket; items: AppNotification[] }> = []
  let count = 0
  for (const bucket of order) {
    const list = grouped[bucket]
    if (list.length === 0) continue
    const take = list.slice(0, Math.max(0, maxItems - count))
    if (take.length > 0) out.push({ bucket, items: take })
    count += take.length
    if (count >= maxItems) break
  }
  return out
}
