import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import {
  deleteAllNotifications,
  getNotifications,
  markAllRead,
  markNotificationRead,
} from '../../services/notificationApi'
import { NotificationDropdownList } from '../notifications/NotificationDropdownList'

export function MobileFloatingNotifications({
  accountId,
  hidden,
  layout = 'default',
}: {
  accountId: string
  hidden?: boolean
  /** `orderMap`: top-right overlay aligned with safe area (passenger order / map screen). */
  layout?: 'default' | 'orderMap'
}) {
  const t = strings()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const unread = notifications.filter((n) => !n.read).length

  if (hidden) return null

  const orderMap = layout === 'orderMap'

  return (
    <div
      className={cn('fixed z-[340] lg:hidden', orderMap ? 'right-4' : 'right-3 top-3')}
      style={orderMap ? { top: 'calc(env(safe-area-inset-top, 0px) + 8px)' } : undefined}
    >
      <button
        type="button"
        aria-label={t.notifications.bell}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full text-slate-600 shadow-md backdrop-blur-md',
          orderMap
            ? 'h-11 min-h-[44px] w-11 min-w-[44px] border border-black/[0.06] bg-[rgba(255,255,255,0.92)]'
            : 'h-10 w-10 border border-slate-200 bg-white/95'
        )}
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
                className="text-[11px] font-semibold text-brand-teal hover:text-brand-teal disabled:opacity-40"
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
                className="text-[11px] font-semibold text-[#EF4444] hover:text-[#DC2626] disabled:opacity-40"
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
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            <NotificationDropdownList
              notifications={notifications}
              t={t}
              maxItems={20}
              onItemActivate={async (n) => {
                await markNotificationRead(n.id, accountId)
                await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
              }}
            />
          </ul>
        </div>
      ) : null}
    </div>
  )
}
