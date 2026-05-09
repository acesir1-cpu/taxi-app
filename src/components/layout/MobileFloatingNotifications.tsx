import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useMarkAllNotificationsReadWhenPanelOpen } from '../../hooks/useMarkAllNotificationsReadWhenPanelOpen'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { notificationDeepLink, type AppRole } from '../../lib/notificationDeepLink'
import { cn } from '../../lib/utils'
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllRead,
  markNotificationRead,
} from '../../services/notificationApi'
import {
  NotificationBottomSheet,
  NotificationSheetDeleteAllButton,
  NotificationSheetMarkAllReadButton,
} from '../notifications/NotificationBottomSheet'
import { NotificationDropdownList } from '../notifications/NotificationDropdownList'

export function MobileFloatingNotifications({
  accountId,
  appRole,
  hidden,
  layout = 'default',
}: {
  accountId: string
  appRole: AppRole
  hidden?: boolean
  /** `orderMap`: top-right overlay aligned with safe area (passenger order / map screen). */
  layout?: 'default' | 'orderMap'
}) {
  const t = strings()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const unread = notifications.filter((n) => !n.read).length
  useMarkAllNotificationsReadWhenPanelOpen(open, accountId, unread)

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open])

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
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      <NotificationBottomSheet
        open={open}
        onClose={() => setOpen(false)}
        headerActions={
          <>
            <NotificationSheetMarkAllReadButton
              disabled={unread === 0}
              onClick={async () => {
                await markAllRead(accountId)
                await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
              }}
            >
              Pročitaj sve
            </NotificationSheetMarkAllReadButton>
            <NotificationSheetDeleteAllButton
              disabled={notifications.length === 0}
              onClick={async () => {
                await deleteAllNotifications(accountId)
                await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                setOpen(false)
              }}
            >
              Obriši sve
            </NotificationSheetDeleteAllButton>
          </>
        }
      >
        <ul className="flex-1 overflow-y-auto pb-3">
          <NotificationDropdownList
            notifications={notifications}
            t={t}
            onItemActivate={async (n) => {
              await markNotificationRead(n.id, accountId)
              await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
              navigate(notificationDeepLink(n, appRole))
              setOpen(false)
            }}
            onItemDelete={async (n) => {
              await deleteNotification(n.id, accountId)
              await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
            }}
          />
        </ul>
      </NotificationBottomSheet>
    </div>
  )
}
