import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, Car, History, LogOut, Navigation, User, UserCircle } from 'lucide-react'
import { AppLogo } from '../brand/AppLogo'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { getNotifications, markNotificationRead } from '../../services/notificationApi'
import { logout } from '../../services/authApi'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useState } from 'react'

export function TopBar({ accountId, name }: { accountId: string; name: string }) {
  const t = strings()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
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

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.1] bg-white/90 backdrop-blur-xl backdrop-saturate-150">
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-card"
              >
                <p className="px-2 pb-2 text-xs font-semibold text-slate-500">{t.notifications.bell}</p>
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-2 py-6 text-center text-sm text-slate-500">{t.common.noNotifications}</li>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className="w-full rounded-xl px-2 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={async () => {
                            await markNotificationRead(n.id, accountId)
                            await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                          }}
                        >
                          <span className="font-semibold text-brand-navy">{n.title}</span>
                          <span className="block text-xs text-slate-600">{n.body}</span>
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
          >
            <UserCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <span className="truncate">{name}</span>
          </Link>
          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={onLogout} aria-label={t.auth.logout}>
            <LogOut className="h-5 w-5" />
          </Button>
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
