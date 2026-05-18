import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Car,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AppLogo } from '../brand/AppLogo'
import { NotificationBottomSheet, NotificationSheetDeleteAllButton, NotificationSheetMarkAllReadButton } from '../notifications/NotificationBottomSheet'
import { NotificationDesktopDropdown } from '../notifications/NotificationDesktopDropdown'
import { NotificationDropdownList } from '../notifications/NotificationDropdownList'
import { useMarkAllNotificationsReadWhenPanelOpen } from '../../hooks/useMarkAllNotificationsReadWhenPanelOpen'
import { useMinWidth768 } from '../../hooks/useMinWidth768'
import { notificationDeepLink } from '../../lib/notificationDeepLink'
import { cn } from '../../lib/utils'
import { deleteAllNotifications, deleteNotification, getNotifications, markAllRead, markNotificationRead } from '../../services/notificationApi'
import { logout } from '../../services/authApi'
import { dispatcherRoleLabel } from '../../services/dispatcherApi'
import { strings } from '../../i18n/strings'
import type { DispatcherRoleLevel } from '../../types/domain'

export function DispatchTopBar({
  accountId,
  name,
  roleLevel,
}: {
  accountId: string
  name: string
  roleLevel: DispatcherRoleLevel
}) {
  const navigate = useNavigate()
  const t = strings()
  const location = useLocation()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const bellTriggerRef = useRef<HTMLDivElement>(null)
  const isDesktopNotifications = useMinWidth768()
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const unread = notifications.filter((n) => !n.read).length
  useMarkAllNotificationsReadWhenPanelOpen(open, accountId, unread)

  const navItems = useMemo(
    () =>
      [
        { to: '/dispatch', end: true, label: t.dispatcher.nav.dashboard, icon: LayoutDashboard },
        { to: '/dispatch/rides', label: t.dispatcher.nav.rides, icon: Car },
        { to: '/dispatch/drivers', label: t.dispatcher.nav.drivers, icon: Users },
        { to: '/dispatch/problems', label: t.dispatcher.nav.problems, icon: AlertTriangle },
        { to: '/dispatch/reports', label: t.dispatcher.nav.reports, icon: BarChart3 },
        { to: '/dispatch/activity', label: t.dispatcher.nav.activity, icon: Activity },
        { to: '/dispatch/settings', label: t.dispatcher.nav.settings, icon: Settings },
      ] as const,
    [t],
  )

  useEffect(() => {
    setOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!profileOpen) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (profileRef.current?.contains(target) || profileButtonRef.current?.contains(target)) return
      setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [profileOpen])

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    navigate('/welcome', { replace: true })
  }

  return (
    <header className="dispatch-top-bar app-top-bar sticky top-0 z-[280] overflow-visible border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex min-h-16 max-w-[92rem] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link to="/dispatch" className="flex min-w-0 items-center py-1 outline-none ring-brand-teal/40 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2">
          <AppLogo variant="light" brandName={t.brand} className="gap-1.5" />
        </Link>

        <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1 lg:order-2 lg:w-auto lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : undefined}
                className={({ isActive }) =>
                  cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? item.to === '/dispatch'
                        ? 'bg-brand-yellow/30 text-brand-navy shadow-[0_1px_0_rgba(15,23,42,0.08)]'
                        : 'bg-white text-brand-navy shadow-[0_1px_0_rgba(15,23,42,0.08)]'
                      : 'text-slate-700 hover:bg-white/90 hover:text-brand-navy',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="order-2 flex items-center gap-2 lg:order-3">
          <div className="relative" ref={bellTriggerRef}>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
              aria-label={t.notifications.bell}
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => {
                setOpen((v) => !v)
                setProfileOpen(false)
              }}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute -right-0.5 top-0 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
            {isDesktopNotifications ? (
              <NotificationDesktopDropdown
                open={open}
                onClose={() => setOpen(false)}
                triggerRef={bellTriggerRef}
                headerActions={
                  <>
                    <NotificationSheetMarkAllReadButton
                      disabled={unread === 0}
                      onClick={async () => {
                        await markAllRead(accountId)
                        await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                      }}
                    >
                      {t.notifications.markAllRead}
                    </NotificationSheetMarkAllReadButton>
                    <NotificationSheetDeleteAllButton
                      disabled={notifications.length === 0}
                      onClick={async () => {
                        await deleteAllNotifications(accountId)
                        await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                        setOpen(false)
                      }}
                    >
                      {t.notifications.deleteAll}
                    </NotificationSheetDeleteAllButton>
                  </>
                }
              >
                <ul className="pb-2">
                  <NotificationDropdownList
                    notifications={notifications}
                    t={t}
                    onItemActivate={async (n) => {
                      await markNotificationRead(n.id, accountId)
                      await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                      navigate(notificationDeepLink(n, 'dispatcher'))
                      setOpen(false)
                    }}
                    onItemDelete={async (n) => {
                      await deleteNotification(n.id, accountId)
                      await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                    }}
                  />
                </ul>
              </NotificationDesktopDropdown>
            ) : null}
          </div>

          <div className="relative">
            <button
              ref={profileButtonRef}
              type="button"
              className="flex min-w-0 max-w-[230px] items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => {
                setProfileOpen((v) => !v)
                setOpen(false)
              }}
            >
              <UserCircle className="h-5 w-5 shrink-0 text-slate-500" />
              <span className="hidden min-w-0 truncate sm:inline">{name}</span>
            </button>
            {profileOpen ? (
              <div
                ref={profileRef}
                role="menu"
                className="absolute right-0 z-[320] mt-2 w-[min(calc(100vw-2rem),17rem)] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-card"
              >
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="truncate text-sm font-bold text-brand-navy">{name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {dispatcherRoleLabel(roleLevel)}
                  </p>
                </div>
                <Link
                  role="menuitem"
                  to="/dispatch/settings"
                  className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-navy"
                >
                  <ClipboardList className="h-4 w-4" />
                  {t.dispatcher.shell.profileAccess}
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => void onLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  {t.auth.logout}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!isDesktopNotifications ? (
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
                {t.notifications.markAllRead}
              </NotificationSheetMarkAllReadButton>
              <NotificationSheetDeleteAllButton
                disabled={notifications.length === 0}
                onClick={async () => {
                  await deleteAllNotifications(accountId)
                  await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                  setOpen(false)
                }}
              >
                {t.notifications.deleteAll}
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
                navigate(notificationDeepLink(n, 'dispatcher'))
                setOpen(false)
              }}
              onItemDelete={async (n) => {
                await deleteNotification(n.id, accountId)
                await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
              }}
            />
          </ul>
        </NotificationBottomSheet>
      ) : null}
    </header>
  )
}
