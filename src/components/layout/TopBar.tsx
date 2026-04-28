import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, Car, History, LogOut, Navigation, User, UserCircle } from 'lucide-react'
import { AppLogo } from '../brand/AppLogo'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { deleteAllNotifications, getNotifications, markAllRead, markNotificationRead } from '../../services/notificationApi'
import { logout } from '../../services/authApi'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useEffect, useRef, useState } from 'react'

export function TopBar({ accountId, name }: { accountId: string; name: string }) {
  const t = strings()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false)
  const [hadOpenSession, setHadOpenSession] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => getNotifications(accountId),
  })
  const unread = notifications.filter((n) => !n.read).length

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    navigate('/welcome', { replace: true })
  }

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current?.contains(target)) return
      if (bellRef.current?.contains(target)) return
      setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

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
    const close = () => setOpen(false)
    document.addEventListener('urbanflow:nav-click', close as EventListener)
    return () => document.removeEventListener('urbanflow:nav-click', close as EventListener)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-[280] border-b border-black/[0.1] bg-white/90 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          to="/app/order"
          className="flex min-w-0 items-center gap-1 rounded-xl py-1 pr-2 outline-none ring-brand-teal/40 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <AppLogo variant="light" brandName={t.brand} />
        </Link>
        <nav className="hidden items-center lg:flex lg:gap-0.5">
          <AppNavLink end to="/app/order" icon={<Car className="h-4 w-4" />} label={t.nav.orderRide} />
          <AppNavLink to="/app/active" icon={<Navigation className="h-4 w-4" />} label={t.nav.activeRide} />
          <AppNavLink to="/app/history" icon={<History className="h-4 w-4" />} label={t.nav.history} />
          <AppNavLink to="/app/profile" icon={<User className="h-4 w-4" />} label={t.nav.profile} />
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <button
              ref={bellRef}
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-brand-navy transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
              aria-label={t.notifications.bell}
              onClick={() => setOpen((v) => !v)}
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
                ref={dropdownRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 z-[320] mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-card"
              >
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
                      className="h-7 px-2 text-[11px] font-semibold text-red-600 hover:text-red-700"
                      disabled={notifications.length === 0}
                      onClick={() => setConfirmDeleteAllOpen(true)}
                    >
                      {t.notifications.deleteAll}
                    </Button>
                  </div>
                </div>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-2 py-6 text-center text-sm text-slate-500">{t.common.noNotifications}</li>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={cn(
                            'w-full rounded-xl px-2 py-2 text-left text-sm transition-colors',
                            n.read
                              ? 'hover:bg-slate-50'
                              : 'border border-brand-teal/25 bg-teal-50/70 hover:bg-teal-50'
                          )}
                          onClick={async () => {
                            await markNotificationRead(n.id, accountId)
                            await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                          }}
                        >
                          <span className={cn('font-semibold text-brand-navy', !n.read && 'font-extrabold')}>
                            {n.title}
                          </span>
                          <span className="block text-xs text-slate-600">{n.body}</span>
                          {!n.read ? (
                            <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-teal">
                              {t.notifications.newBadge}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </motion.div>
            ) : null}
          </div>
          <span className="hidden h-7 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
          <Link
            to="/app/profile"
            className="hidden min-w-0 max-w-[200px] items-center gap-1.5 rounded-lg py-1 pl-0.5 pr-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100/90 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 focus-visible:ring-offset-2 sm:flex"
            aria-label={`${t.nav.profile}: ${name}`}
            title={t.nav.profile}
            onClick={() => setOpen(false)}
          >
            <UserCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <span className="truncate">{name}</span>
          </Link>
          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={onLogout} aria-label={t.auth.logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {confirmDeleteAllOpen ? (
        <div className="fixed inset-0 z-[340] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-brand-navy">{t.notifications.deleteAllTitle}</h3>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteAllOpen(false)}>
                {t.common.close}
              </Button>
            </div>
            <p className="text-sm text-slate-700">{t.notifications.deleteAllConfirm}</p>
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              {t.notifications.deleteAllHint}
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="w-full" variant="secondary" onClick={() => setConfirmDeleteAllOpen(false)}>
                {t.notifications.deleteAllCancel}
              </Button>
              <Button
                className="w-full"
                variant="danger"
                onClick={async () => {
                  await deleteAllNotifications(accountId)
                  await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                  setConfirmDeleteAllOpen(false)
                  setOpen(false)
                }}
              >
                {t.notifications.deleteAllConfirmCta}
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="absolute inset-0 -z-10"
            aria-label={t.common.close}
            onClick={() => setConfirmDeleteAllOpen(false)}
          />
        </div>
      ) : null}
    </header>
  )
}

function AppNavLink({
  to,
  label,
  icon,
  end: endProp,
}: {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
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
          'flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150 ease-out',
          isActive
            ? 'font-semibold text-brand-navy underline decoration-2 decoration-brand-navy underline-offset-[10px]'
            : 'text-slate-700 hover:bg-slate-100/90 hover:text-brand-navy'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
