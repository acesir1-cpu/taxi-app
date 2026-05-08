import type { AppNotification } from '../types/domain'

export type NotificationDayBucket = 'today' | 'yesterday' | 'older'

function startOfLocalDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function notificationDayBucket(iso: string): NotificationDayBucket {
  const created = new Date(iso).getTime()
  const now = new Date()
  const todayStart = startOfLocalDay(now)
  const yesterdayStart = todayStart - 86400000
  if (created >= todayStart) return 'today'
  if (created >= yesterdayStart) return 'yesterday'
  return 'older'
}

export function groupNotificationsByDay(
  items: AppNotification[]
): Record<NotificationDayBucket, AppNotification[]> {
  const r: Record<NotificationDayBucket, AppNotification[]> = {
    today: [],
    yesterday: [],
    older: [],
  }
  for (const n of items) {
    r[notificationDayBucket(n.createdAt)].push(n)
  }
  return r
}

/** Flatten grouped sections with a max total count (newest-first order preserved per bucket). */
export function takeGroupedNotifications(
  items: AppNotification[],
  maxItems: number
): Array<{ bucket: NotificationDayBucket; items: AppNotification[] }> {
  const grouped = groupNotificationsByDay(items)
  const order: NotificationDayBucket[] = ['today', 'yesterday', 'older']
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
