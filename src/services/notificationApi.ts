import type { AppMessages } from '../i18n/strings'
import type { AppNotification, NotificationI18nKey } from '../types/domain'
import { delay } from './delay'
import { getDb, persist } from './mockDb'

function id(): string {
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Naslov i tijelo za trenutni jezik aplikacije. */
export function notificationDisplay(n: AppNotification, msg: AppMessages): { title: string; body: string } {
  if (n.titleKey != null && n.bodyKey != null) {
    const ni = msg.notifications
    return { title: ni[n.titleKey], body: ni[n.bodyKey] }
  }
  return { title: n.title ?? '', body: n.body ?? '' }
}

export async function getNotifications(accountId: string): Promise<AppNotification[]> {
  await delay()
  const db = getDb()
  return db.notifications.filter((n) => n.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addNotification(
  accountId: string,
  titleKey: NotificationI18nKey,
  bodyKey: NotificationI18nKey,
  type: string
): Promise<AppNotification> {
  await delay(200)
  const db = getDb()
  const n: AppNotification = {
    id: id(),
    accountId,
    titleKey,
    bodyKey,
    read: false,
    createdAt: new Date().toISOString(),
    type,
  }
  db.notifications.unshift(n)
  persist()
  return n
}

/** Obavještenje s proizvoljnim naslovom i tekstom (npr. sažetak vožnje za vozača). */
export async function addNotificationRaw(
  accountId: string,
  title: string,
  body: string,
  type: string
): Promise<AppNotification> {
  await delay(200)
  const db = getDb()
  const n: AppNotification = {
    id: id(),
    accountId,
    read: false,
    createdAt: new Date().toISOString(),
    type,
    title,
    body,
  }
  db.notifications.unshift(n)
  persist()
  return n
}

export async function markNotificationRead(notificationId: string, accountId: string): Promise<void> {
  await delay(150)
  const db = getDb()
  const n = db.notifications.find((x) => x.id === notificationId && x.accountId === accountId)
  if (n) {
    n.read = true
    persist()
  }
}

export async function markAllRead(accountId: string): Promise<void> {
  await delay(150)
  const db = getDb()
  for (const n of db.notifications) {
    if (n.accountId === accountId) n.read = true
  }
  persist()
}

export async function deleteAllNotifications(accountId: string): Promise<void> {
  await delay(150)
  const db = getDb()
  db.notifications = db.notifications.filter((n) => n.accountId !== accountId)
  persist()
}
