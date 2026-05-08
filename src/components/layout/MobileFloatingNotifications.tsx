import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Inbox } from 'lucide-react'
import { useState } from 'react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import {
  deleteAllNotifications,
  getNotifications,
  markAllRead,
  markNotificationRead,
  notificationDisplay,
} from '../../services/notificationApi'

export function MobileFloatingNotifications({
  accountId,
  hidden,
}: {
  accountId: string
  hidden?: boolean
}) {
  const t = strings()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const unread = notifications.filter((n) => !n.read).length

  function notificationTone(type: string): { container: string; dot: string } {
    if (type === 'ride') return { container: 'border-l-2 border-l-brand-yellow', dot: 'bg-brand-yellow' }
    if (type === 'complaint' || type === 'problem') return { container: 'border-l-2 border-l-brand-danger', dot: 'bg-brand-danger' }
    return { container: 'border-l-2 border-l-brand-teal', dot: 'bg-brand-teal' }
  }

  function timeAgo(iso: string): string {
    const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
    if (diffMinutes < 60) return `prije ${diffMinutes} min`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `prije ${diffHours} h`
    const diffDays = Math.floor(diffHours / 24)
    return `prije ${diffDays} d`
  }

  if (hidden) return null

  return (
    <div className="fixed right-3 top-3 z-[360] lg:hidden">
      <button
        type="button"
        aria-label={t.notifications.bell}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur-md"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-white bg-brand-danger" />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-2 w-[min(88vw,22rem)] rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
          <span className="pointer-events-none absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-slate-200/80 bg-white" aria-hidden />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="text-xs font-semibold text-slate-500">{t.notifications.bell}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-teal disabled:opacity-40"
                disabled={unread === 0}
                onClick={async () => {
                  await markAllRead(accountId)
                  await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                }}
              >
                {t.notifications.markAllRead}
              </button>
              <button
                type="button"
                className="text-[11px] font-semibold text-slate-600 disabled:opacity-40"
                disabled={notifications.length === 0}
                onClick={async () => {
                  await deleteAllNotifications(accountId)
                  await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                  setOpen(false)
                }}
              >
                {t.notifications.deleteAll}
              </button>
            </div>
          </div>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-2 py-7 text-center text-sm text-slate-500">
                <div className="flex flex-col items-center gap-1.5">
                  <Inbox className="h-4 w-4 text-slate-400" aria-hidden />
                  <p className="text-sm font-medium text-slate-500">{t.common.noNotifications}</p>
                  <p className="text-xs text-slate-400">Sve je ažurno!</p>
                </div>
              </li>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const { title, body } = notificationDisplay(n, t)
                const tone = notificationTone(n.type)
                const itemTitle = title || body
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-xl px-2 py-2 text-left text-sm transition-colors',
                        tone.container,
                        n.read ? 'hover:bg-slate-50' : 'bg-slate-50/70 hover:bg-slate-100/70'
                      )}
                      onClick={async () => {
                        await markNotificationRead(n.id, accountId)
                        await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                      }}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className={cn('block truncate font-semibold text-brand-navy', !n.read && 'font-extrabold')}>
                            {itemTitle}
                          </span>
                          <span className="block text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.read ? <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden /> : null}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
