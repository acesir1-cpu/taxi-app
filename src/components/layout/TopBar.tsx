import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, CalendarClock, Car, History, Inbox, LogOut, Navigation, Settings, User, UserCircle } from 'lucide-react'
import { AppLogo } from '../brand/AppLogo'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import {
  deleteAllNotifications,
  getNotifications,
  markAllRead,
  markNotificationRead,
  notificationDisplay,
} from '../../services/notificationApi'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useEffect, useRef, useState } from 'react'
import { useLangRefresh } from '../../hooks/useLangRefresh'
import { loadPassengerProfileExtras } from '../../lib/passengerSettingsPrefs'
import { logout } from '../../services/authApi'

export function TopBar({ accountId, name }: { accountId: string; name: string }) {
  useLangRefresh()
  const t = strings()
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [hadOpenSession, setHadOpenSession] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState(() => loadPassengerProfileExtras(accountId).avatarDataUrl ?? '')
  const notificationsDropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!open && !profileMenuOpen) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (notificationsDropdownRef.current?.contains(target)) return
      if (bellRef.current?.contains(target)) return
      if (profileMenuRef.current?.contains(target)) return
      if (profileButtonRef.current?.contains(target)) return
      setOpen(false)
      setProfileMenuOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, profileMenuOpen])

  useEffect(() => {
    if (open) {
      setHadOpenSession(true)
      return
    }
    if (!hadOpenSession) return
    if (unread === 0) {
      setHadOpenSession(false)
      return
    }
    void (async () => {
      await markAllRead(accountId)
      await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
      setHadOpenSession(false)
    })()
  }, [accountId, hadOpenSession, open, qc, unread])

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

  useEffect(() => {
    setAvatarDataUrl(loadPassengerProfileExtras(accountId).avatarDataUrl ?? '')
  }, [accountId])

  useEffect(() => {
    const refreshAvatar = () => setAvatarDataUrl(loadPassengerProfileExtras(accountId).avatarDataUrl ?? '')
    window.addEventListener('urbanflow:passenger-profile-photo-updated', refreshAvatar)
    return () => window.removeEventListener('urbanflow:passenger-profile-photo-updated', refreshAvatar)
  }, [accountId])

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

  return (
    <header className="app-top-bar sticky top-0 z-[280] border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[82rem] items-center justify-between gap-3 px-4 sm:h-16 sm:gap-5 sm:px-6">
        <Link
          to="/app/order"
          className="flex min-w-0 items-center py-1 outline-none ring-brand-teal/40 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <AppLogo variant="light" brandName={t.brand} className="gap-1.5" />
        </Link>
        <nav className="hidden items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1 lg:flex lg:gap-1.5">
          <AppNavLink end to="/app/order" icon={<Car className="h-4 w-4" />} label={t.nav.orderRide} activeTone="yellow" />
          <AppNavLink to="/app/active" icon={<Navigation className="h-4 w-4" />} label={t.nav.activeRide} />
          <AppNavLink to="/app/scheduled" icon={<CalendarClock className="h-4 w-4" />} label={t.nav.scheduled} />
          <AppNavLink to="/app/history" icon={<History className="h-4 w-4" />} label={t.nav.history} />
        </nav>
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-1.5 py-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            <div className="relative">
            <button
              ref={bellRef}
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-brand-navy transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
              aria-label={t.notifications.bell}
              onClick={() => {
                setOpen((v) => !v)
                setProfileMenuOpen(false)
              }}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute -right-0.5 top-0 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand-danger px-0.5 text-[8px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
            {open ? (
              <motion.div
                ref={notificationsDropdownRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 z-[320] mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
              >
                <span className="pointer-events-none absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-slate-200/80 bg-white" aria-hidden />
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <p className="text-xs font-semibold text-slate-500">{t.notifications.bell}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold"
                      disabled={unread === 0}
                      onClick={async () => {
                        await markAllRead(accountId)
                        await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                      }}
                    >
                      {t.notifications.markAllRead}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold"
                      disabled={notifications.length === 0}
                      onClick={async () => {
                        await deleteAllNotifications(accountId)
                        await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                        setOpen(false)
                      }}
                    >
                      {t.notifications.deleteAll}
                    </Button>
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
                      const { title: nTitle, body: nBody } = notificationDisplay(n, t)
                      const tone = notificationTone(n.type)
                      const title = nTitle || nBody
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
                                {title}
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
              </motion.div>
            ) : null}
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
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt={name}
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
                    to="/app/profile#profile-account"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand-navy"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      if (typeof document !== 'undefined') {
                        document.dispatchEvent(new CustomEvent('urbanflow:nav-click'))
                      }
                    }}
                  >
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    {t.nav.profileAccount}
                  </Link>
                  <Link
                    role="menuitem"
                    to="/app/profile"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand-navy"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      if (typeof document !== 'undefined') {
                        document.dispatchEvent(new CustomEvent('urbanflow:nav-click'))
                      }
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
                      void (async () => {
                        await logout()
                        await qc.invalidateQueries({ queryKey: ['me'] })
                        navigate('/welcome', { replace: true })
                      })()
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
      </div>
    </header>
  )
}

function AppNavLink({
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
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('urbanflow:nav-click'))
        }
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
