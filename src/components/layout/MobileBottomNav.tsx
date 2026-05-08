import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Car, History, LogOut, Navigation, Settings, User, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../../services/authApi'
import { strings } from '../../i18n/strings'
import { loadPassengerProfileExtras } from '../../lib/passengerSettingsPrefs'
import { cn } from '../../lib/utils'
import {
  MobileNavOverflowMenu,
  mobileNavOverflowMenuDangerClassName,
  mobileNavOverflowMenuLinkClassName,
  mobileTabBarItemClass,
  mobileTabBarNavLinkClass,
  mobileTabBarNavShellClassName,
} from './mobileNavPrimitives'

export function MobileBottomNav({ accountId, name }: { accountId: string; name: string }) {
  const t = strings()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState(() => loadPassengerProfileExtras(accountId).avatarDataUrl ?? '')

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

  return (
    <>
      <MobileNavOverflowMenu open={profileMenuOpen} onClose={() => setProfileMenuOpen(false)}>
        <Link
          to="/app/history"
          className={mobileNavOverflowMenuLinkClassName}
          onClick={() => setProfileMenuOpen(false)}
        >
          <History className="h-4 w-4" />
          {t.nav.history}
        </Link>
        <Link
          to="/app/profile#profile-account"
          className={mobileNavOverflowMenuLinkClassName}
          onClick={() => setProfileMenuOpen(false)}
        >
          <User className="h-4 w-4" />
          {t.nav.profileAccount}
        </Link>
        <Link
          to="/app/profile"
          className={mobileNavOverflowMenuLinkClassName}
          onClick={() => setProfileMenuOpen(false)}
        >
          <Settings className="h-4 w-4" />
          {t.nav.profile}
        </Link>
        <button
          type="button"
          className={mobileNavOverflowMenuDangerClassName}
          onClick={() => {
            setProfileMenuOpen(false)
            void onLogout()
          }}
        >
          <LogOut className="h-4 w-4" />
          {t.auth.logout}
        </button>
      </MobileNavOverflowMenu>
      <nav className={cn('passenger-mobile-nav', mobileTabBarNavShellClassName)} role="navigation">
        <NavLink to="/app/order" className={mobileTabBarNavLinkClass}>
          <Car className="h-5 w-5" />
          {t.nav.order}
        </NavLink>
        <NavLink to="/app/scheduled" className={mobileTabBarNavLinkClass}>
          <CalendarClock className="h-5 w-5" />
          {t.nav.scheduled}
        </NavLink>
        <NavLink to="/app/active" className={mobileTabBarNavLinkClass}>
          <Navigation className="h-5 w-5" />
          {t.nav.activeShort}
        </NavLink>
        <button
          type="button"
          className={mobileTabBarItemClass(profileTabActive)}
          onClick={() => setProfileMenuOpen(true)}
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
