import { useQueryClient } from '@tanstack/react-query'
import { Banknote, Car, History, LayoutDashboard, LogOut, Settings, User } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  mobileTabBarNavLinkClass,
  mobileTabBarNavShellClassName,
} from '../layout/mobileNavPrimitives'

export function DriverMobileNav() {
  const t = strings()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)

  useEffect(() => {
    setSettingsMenuOpen(false)
  }, [location.pathname])

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    await qc.invalidateQueries({ queryKey: ['driverUi'] })
    navigate('/welcome', { replace: true })
  }

  const settingsActive =
    location.pathname === '/driver/settings' || settingsMenuOpen

  return (
    <>
      <MobileNavOverflowMenu open={settingsMenuOpen} onClose={() => setSettingsMenuOpen(false)}>
        <Link
          to="/driver/settings#profile-account"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDivider)}
          onClick={() => setSettingsMenuOpen(false)}
        >
          <User className={mobileNavOverflowSheetIconClass} aria-hidden />
          {t.nav.profileAccount}
        </Link>
        <Link
          to="/driver/settings"
          className={cn(mobileNavOverflowSheetRowBase, mobileNavOverflowSheetRowDividerDanger)}
          onClick={() => setSettingsMenuOpen(false)}
        >
          <Settings className={mobileNavOverflowSheetIconClass} aria-hidden />
          {t.nav.profile}
        </Link>
        <button
          type="button"
          className={mobileNavOverflowSheetDangerRow}
          onClick={() => {
            setSettingsMenuOpen(false)
            void onLogout()
          }}
        >
          <LogOut className={mobileNavOverflowSheetDangerIconClass} aria-hidden />
          {t.auth.logout}
        </button>
      </MobileNavOverflowMenu>
      <nav
        className={cn('driver-mobile-nav', mobileTabBarNavShellClassName)}
        role="navigation"
        aria-label={t.driver.mobileNavAria}
      >
        <NavLink to="/driver" end className={mobileTabBarNavLinkClass}>
          <LayoutDashboard className="h-5 w-5" />
          {t.driver.navHomeShort}
        </NavLink>
        <NavLink to="/driver/active" className={mobileTabBarNavLinkClass}>
          <Car className="h-5 w-5" />
          {t.driver.navActiveShort}
        </NavLink>
        <NavLink to="/driver/history" className={mobileTabBarNavLinkClass}>
          <History className="h-5 w-5" />
          {t.driver.navHistory}
        </NavLink>
        <NavLink to="/driver/earnings" className={mobileTabBarNavLinkClass}>
          <Banknote className="h-5 w-5" />
          {t.driver.navEarnings}
        </NavLink>
        <button
          type="button"
          className={mobileTabBarItemClass(settingsActive)}
          onClick={() => setSettingsMenuOpen(true)}
        >
          <Settings className="h-5 w-5" />
          {t.driver.navSettings}
        </button>
      </nav>
    </>
  )
}
