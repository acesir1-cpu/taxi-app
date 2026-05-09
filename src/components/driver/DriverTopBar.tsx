import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Banknote,
  Bell,
  Car,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  UserCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLangRefresh } from '../../hooks/useLangRefresh'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { notificationDeepLink } from '../../lib/notificationDeepLink'
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
import { NotificationDesktopDropdown } from '../notifications/NotificationDesktopDropdown'
import { NotificationDropdownList } from '../notifications/NotificationDropdownList'
import { logout } from '../../services/authApi'
import { useMarkAllNotificationsReadWhenPanelOpen } from '../../hooks/useMarkAllNotificationsReadWhenPanelOpen'
import { useMinWidth768 } from '../../hooks/useMinWidth768'
import { getDriverAvatarUrlSync } from '../../services/driverPhotoApi'
import { AppLogo } from '../brand/AppLogo'
import { cn } from '../../lib/utils'

export function DriverTopBar({
  accountId,
  name,
  linkedDriverId,
}: {
  accountId: string
  name: string
  linkedDriverId: string
}) {
  useLangRefresh()
  const t = strings()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const bellTriggerRef = useRef<HTMLDivElement>(null)
  const isDesktopNotifications = useMinWidth768()
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const { data: driverAvatar = null } = useQuery({
    queryKey: ['driverAvatar', linkedDriverId],
    queryFn: async () => getDriverAvatarUrlSync(linkedDriverId) ?? null,
    enabled: Boolean(linkedDriverId),
  })
  const unread = notifications.filter((n) => !n.read).length
  useMarkAllNotificationsReadWhenPanelOpen(open, accountId, unread)

  useEffect(() => {
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['driverAvatar', linkedDriverId] })
    }
    window.addEventListener('urbanflow:driver-avatar-updated', refresh)
    return () => window.removeEventListener('urbanflow:driver-avatar-updated', refresh)
  }, [qc, linkedDriverId])

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    await qc.invalidateQueries({ queryKey: ['driverUi'] })
    navigate('/welcome', { replace: true })
  }

  useEffect(() => {
    if (!profileMenuOpen) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (profileMenuRef.current?.contains(target)) return
      if (profileButtonRef.current?.contains(target)) return
      setProfileMenuOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    const close = () => {
      setOpen(false)
      setProfileMenuOpen(false)
    }
    document.addEventListener('urbanflow:nav-click', close as EventListener)
    return () => document.removeEventListener('urbanflow:nav-click', close as EventListener)
  }, [])

  useEffect(() => {
    setOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="app-top-bar sticky top-0 z-[280] overflow-visible border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[82rem] items-center justify-between gap-3 overflow-visible px-4 sm:h-16 sm:gap-5 sm:px-6">
        <Link
          to="/driver"
          className="flex min-w-0 shrink items-center py-1 outline-none ring-brand-teal/40 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <AppLogo variant="light" brandName={t.brand} className="gap-1.5" />
        </Link>
        <nav className="hidden items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1 lg:flex lg:gap-1.5">
          <DrvNavLink
            end
            activeTone="yellow"
            to="/driver"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label={t.driver.navDashboard}
          />
          <DrvNavLink to="/driver/active" icon={<Car className="h-4 w-4" />} label={t.driver.navActiveRide} />
          <DrvNavLink to="/driver/history" icon={<History className="h-4 w-4" />} label={t.driver.navHistory} />
          <DrvNavLink to="/driver/earnings" icon={<Banknote className="h-4 w-4" />} label={t.driver.navEarnings} />
        </nav>
        <div className="flex items-center gap-2.5 overflow-visible md:gap-3">
          <div className="hidden items-center gap-1.5 overflow-visible rounded-xl border border-slate-200/80 bg-white px-1.5 py-1 shadow-[0_1px_0_rgba(15,23,42,0.03)] lg:flex">
            <div className="relative overflow-visible" ref={bellTriggerRef}>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-brand-navy transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
                aria-label={t.notifications.bell}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => {
                  setOpen((v) => !v)
                  setProfileMenuOpen(false)
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
                  <ul className="pb-2">
                    <NotificationDropdownList
                      notifications={notifications}
                      t={t}
                      onItemActivate={async (n) => {
                        await markNotificationRead(n.id, accountId)
                        await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                        navigate(notificationDeepLink(n, 'driver'))
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
          </div>
          <span className="hidden h-6 w-px shrink-0 bg-slate-200 lg:block" aria-hidden />
          <div className="relative hidden lg:block">
            <button
              ref={profileButtonRef}
              type="button"
              className="flex min-w-0 max-w-[220px] items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 focus-visible:ring-offset-2"
              aria-label={`${t.nav.profile}: ${name}`}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              title={name}
              onClick={() => {
                setProfileMenuOpen((v) => !v)
                setOpen(false)
              }}
            >
              {driverAvatar ? (
                <img
                  src={driverAvatar}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <UserCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              )}
              <span className="truncate">{name}</span>
            </button>
            {profileMenuOpen ? (
              <motion.div
                ref={profileMenuRef}
                role="menu"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 z-[320] mt-2 w-[min(calc(100vw-2rem),15rem)] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-card"
              >
                <div className="space-y-1">
                  <Link
                    role="menuitem"
                    to="/driver/settings#profile-account"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand-navy"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      document.dispatchEvent(new CustomEvent('urbanflow:nav-click'))
                    }}
                  >
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    {t.nav.profileAccount}
                  </Link>
                  <Link
                    role="menuitem"
                    to="/driver/settings"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand-navy"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      document.dispatchEvent(new CustomEvent('urbanflow:nav-click'))
                    }}
                  >
                    <Settings className="h-4 w-4 shrink-0" aria-hidden />
                    {t.nav.profile}
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      void onLogout()
                    }}
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                    {t.auth.logout}
                  </button>
                </div>
              </motion.div>
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
                navigate(notificationDeepLink(n, 'driver'))
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

function DrvNavLink({
  to,
  label,
  icon,
  end: endProp,
  activeTone = 'default',
}: {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
  activeTone?: 'default' | 'yellow'
}) {
  return (
    <NavLink
      to={to}
      end={endProp}
      onClick={() => {
        document.dispatchEvent(new CustomEvent('urbanflow:nav-click'))
      }}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ease-out',
          isActive
            ? activeTone === 'yellow'
              ? 'bg-brand-yellow/30 text-brand-navy shadow-[0_1px_0_rgba(15,23,42,0.08)]'
              : 'bg-white text-brand-navy shadow-[0_1px_0_rgba(15,23,42,0.08)]'
            : 'text-slate-700 hover:bg-white/90 hover:text-brand-navy'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
