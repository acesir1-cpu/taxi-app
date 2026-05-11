import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Car, History, LogOut, Navigation, Settings, User, UserCircle } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../../services/authApi'
import { strings } from '../../i18n/strings'
import { loadPassengerProfileExtras } from '../../lib/passengerSettingsPrefs'
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
} from './mobileNavPrimitives'

export function MobileBottomNav({ accountId, name }: { accountId: string; name: string }) {
  const t = strings()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState(() => loadPassengerProfileExtras(accountId).avatarDataUrl ?? '')
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

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    navigate('/welcome', { replace: true })
  }

  const profileTabActive = profileMenuOpen || location.pathname.startsWith('/app/profile')
  const navLinkClass = ({ isActive }: { isActive: boolean }) => mobileTabBarItemClass(!profileMenuOpen && isActive)

  return (
    <>
      <MobileNavOverflowMenu open={profileMenuOpen} onClose={() => setProfileMenuOpen(false)}>
        <Link
          to="/app/history"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDivider)}
          onClick={() => setProfileMenuOpen(false)}
        >
          <History className={mobileNavOverflowSheetIconClass} aria-hidden />
          {t.nav.history}
        </Link>
        <Link
          to="/app/profile#profile-account"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDivider)}
          onClick={() => setProfileMenuOpen(false)}
        >
          <User className={mobileNavOverflowSheetIconClass} aria-hidden />
          {t.nav.profileAccount}
        </Link>
        <Link
          to="/app/profile"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDividerDanger)}
          onClick={() => setProfileMenuOpen(false)}
        >
          <Settings className={mobileNavOverflowSheetIconClass} aria-hidden />
          {t.nav.profile}
        </Link>
        <button
          type="button"
          className={mobileNavOverflowSheetDangerRow}
          onClick={() => {
            setProfileMenuOpen(false)
            void onLogout()
          }}
        >
          <LogOut className={mobileNavOverflowSheetDangerIconClass} aria-hidden />
          {t.auth.logout}
        </button>
      </MobileNavOverflowMenu>
      <nav
        ref={navRef}
        className={cn('passenger-mobile-nav', mobileTabBarNavShellClassName)}
        role="navigation"
      >
        <NavLink to="/app/order" className={navLinkClass}>
          <Car className="h-5 w-5" />
          {t.nav.order}
        </NavLink>
        <NavLink to="/app/active" className={navLinkClass}>
          <Navigation className="h-5 w-5" />
          {t.nav.activeShort}
        </NavLink>
        <NavLink to="/app/scheduled" className={navLinkClass}>
          <CalendarClock className="h-5 w-5" />
          {t.nav.scheduled}
        </NavLink>
        <button
          type="button"
          className={mobileTabBarItemClass(profileTabActive)}
          onClick={() => setProfileMenuOpen((open) => !open)}
        >
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt={name} className="h-5 w-5 rounded-full border border-slate-200 object-cover" />
          ) : (
            <UserCircle className="h-5 w-5" />
          )}
          {t.nav.profile}
        </button>
      </nav>
    </>
  )
}
