import { useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Car,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  Users,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../../services/authApi'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import {
  MobileNavOverflowMenu,
  mobileNavOverflowSheetDangerIconClass,
  mobileNavOverflowSheetDangerRow,
  mobileNavOverflowSheetIconClass,
  mobileNavOverflowSheetRowBase,
  mobileNavOverflowSheetRowDivider,
  mobileNavOverflowSheetRowDividerDanger,
  mobileTabBarItemClass,
  mobileTabBarNavShellClassName,
} from '../layout/mobileNavPrimitives'

export function DispatchMobileNav() {
  const t = strings()
  const nav = t.dispatcher.nav
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [moreOpen, setMoreOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = navRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const apply = () => root.style.setProperty('--mobile-nav-shell-height', `${el.getBoundingClientRect().height}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--mobile-nav-shell-height')
    }
  }, [])

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    navigate('/welcome', { replace: true })
  }

  const moreActive =
    moreOpen ||
    location.pathname.startsWith('/dispatch/reports') ||
    location.pathname.startsWith('/dispatch/activity') ||
    location.pathname === '/dispatch/settings'

  const navLinkClass = ({ isActive }: { isActive: boolean }) => mobileTabBarItemClass(!moreOpen && isActive)

  return (
    <>
      <MobileNavOverflowMenu open={moreOpen} onClose={() => setMoreOpen(false)}>
        <Link
          to="/dispatch/reports"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDivider)}
          onClick={() => setMoreOpen(false)}
        >
          <BarChart3 className={mobileNavOverflowSheetIconClass} aria-hidden />
          {nav.reports}
        </Link>
        <Link
          to="/dispatch/activity"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDivider)}
          onClick={() => setMoreOpen(false)}
        >
          <Activity className={mobileNavOverflowSheetIconClass} aria-hidden />
          {nav.activity}
        </Link>
        <Link
          to="/dispatch/settings"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDividerDanger)}
          onClick={() => setMoreOpen(false)}
        >
          <Settings className={mobileNavOverflowSheetIconClass} aria-hidden />
          {nav.settings}
        </Link>
        <button
          type="button"
          className={mobileNavOverflowSheetDangerRow}
          onClick={() => {
            setMoreOpen(false)
            void onLogout()
          }}
        >
          <LogOut className={mobileNavOverflowSheetDangerIconClass} aria-hidden />
          {t.auth.logout}
        </button>
      </MobileNavOverflowMenu>
      <nav
        ref={navRef}
        className={cn('dispatch-mobile-nav', mobileTabBarNavShellClassName)}
        role="navigation"
        aria-label={t.dispatcher.shell.mobileNavAria}
      >
        <NavLink to="/dispatch" end className={navLinkClass}>
          <LayoutDashboard className="h-5 w-5" />
          {nav.dashboard}
        </NavLink>
        <NavLink to="/dispatch/rides" className={navLinkClass}>
          <Car className="h-5 w-5" />
          {nav.rides}
        </NavLink>
        <NavLink to="/dispatch/drivers" className={navLinkClass}>
          <Users className="h-5 w-5" />
          {nav.drivers}
        </NavLink>
        <NavLink to="/dispatch/problems" className={navLinkClass}>
          <AlertTriangle className="h-5 w-5" />
          {nav.problems}
        </NavLink>
        <button type="button" className={mobileTabBarItemClass(moreActive)} onClick={() => setMoreOpen((v) => !v)}>
          <MoreHorizontal className="h-5 w-5" />
          {t.dispatcher.shell.mobileMore}
        </button>
      </nav>
    </>
  )
}
