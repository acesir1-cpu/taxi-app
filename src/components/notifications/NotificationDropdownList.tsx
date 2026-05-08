import { Car, Inbox, User, Wallet } from 'lucide-react'
import type { AppMessages } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import { takeGroupedNotifications, type NotificationDayBucket } from '../../lib/notificationDateBuckets'
import { notificationIconCategory } from '../../lib/notificationVisuals'
import { notificationDisplay } from '../../services/notificationApi'
import type { AppNotification } from '../../types/domain'

function formatNotificationTimeAgo(iso: string): string {
  const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMinutes < 60) return `prije ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `prije ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  return `prije ${diffDays} d`
}

function sectionLabel(bucket: NotificationDayBucket, t: AppMessages): string {
  if (bucket === 'today') return t.notifications.sectionToday
  if (bucket === 'yesterday') return t.notifications.sectionYesterday
  return t.notifications.sectionEarlier
}

const ICON_STYLES = {
  ride: { bg: '#FFF3D6', Icon: Car, iconClass: 'text-amber-800' },
  driver: { bg: '#EFF6FF', Icon: User, iconClass: 'text-blue-700' },
  payment: { bg: '#F0FDF4', Icon: Wallet, iconClass: 'text-green-700' },
} as const

function NotificationTypeIcon({ category }: { category: keyof typeof ICON_STYLES }) {
  const { bg, Icon, iconClass } = ICON_STYLES[category]
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 44, height: 44, backgroundColor: bg }}
      aria-hidden
    >
      <Icon className={cn('h-5 w-5', iconClass)} />
    </span>
  )
}

export function NotificationDropdownList({
  notifications,
  t,
  maxItems = 20,
  onItemActivate,
}: {
  notifications: AppNotification[]
  t: AppMessages
  maxItems?: number
  onItemActivate: (n: AppNotification) => void | Promise<void>
}) {
  if (notifications.length === 0) {
    return (
      <li className="px-2 py-7 text-center text-sm text-slate-500">
        <div className="flex flex-col items-center gap-1.5">
          <Inbox className="h-4 w-4 text-slate-400" aria-hidden />
          <p className="text-sm font-medium text-slate-500">{t.common.noNotifications}</p>
          <p className="text-xs text-slate-400">Sve je ažurno!</p>
        </div>
      </li>
    )
  }

  const sections = takeGroupedNotifications(notifications, maxItems)

  return (
    <>
      {sections.map(({ bucket, items }) => (
        <li key={bucket} className="list-none py-0.5 first:pt-0 last:pb-0">
          <div
            className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]"
            role="presentation"
          >
            {sectionLabel(bucket, t)}
          </div>
          <ul className="space-y-1">
            {items.map((n) => {
              const { title: nTitle, body: nBody } = notificationDisplay(n, t)
              const headline = (nTitle || nBody).trim()
              const bodyText = nBody.trim()
              const subline =
                nTitle && bodyText && bodyText !== (nTitle || '').trim() ? bodyText : ''
              const cat = notificationIconCategory(n)
              return (
                <li key={n.id} className="list-none">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors',
                      n.read ? 'hover:bg-slate-50' : 'bg-slate-50/70 hover:bg-slate-100/70'
                    )}
                    onClick={() => void onItemActivate(n)}
                  >
                    <NotificationTypeIcon category={cat} />
                    <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span
                          className={cn(
                            'block truncate font-semibold leading-snug text-brand-navy',
                            !n.read && 'font-extrabold'
                          )}
                        >
                          {headline}
                        </span>
                        {subline ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-[#6B7280]">
                            {subline}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block text-xs text-[#9CA3AF]">
                          {formatNotificationTimeAgo(n.createdAt)}
                        </span>
                      </span>
                      {!n.read ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-teal"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </>
  )
}
