import { Outlet, useLocation } from 'react-router-dom'
import { useMe } from '../../hooks/useMe'
import { useActiveRide } from '../../hooks/useActiveRide'
import { useLangRefresh } from '../../hooks/useLangRefresh'
import { strings } from '../../i18n/strings'
import { LoadingState } from '../common/LoadingState'
import { ActiveRideBanner } from './ActiveRideBanner'
import { MobileFloatingNotifications } from './MobileFloatingNotifications'
import { MobileBottomNav } from './MobileBottomNav'
import { TopBar } from './TopBar'

export function AppShell() {
  useLangRefresh()
  const t = strings()
  const location = useLocation()
  const { data: me, isLoading } = useMe()
  const { data: active } = useActiveRide(me?.kind === 'passenger' ? me.profile.id : undefined)

  if (isLoading || !me || me.kind !== 'passenger') {
    return (
      <div className="app-shell-atmosphere min-h-screen">
        <LoadingState />
      </div>
    )
  }

  const name = `${me.profile.firstName} ${me.profile.lastName}`
  const isOnActiveRideScreen = location.pathname === '/app/active' || location.pathname.startsWith('/app/ride/')
  const hideMobileBell = location.pathname === '/app/profile'

  return (
    <div className="app-shell-atmosphere min-h-screen pb-24 lg:pb-6">
      <div className="pointer-events-none fixed bottom-2 left-2 z-50">
        <span className="rounded-full border border-brand-navy/15 bg-brand-navy px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
          {t.common.appVersionBadge}
        </span>
      </div>
      <TopBar accountId={me.account.id} name={name} />
      <MobileFloatingNotifications accountId={me.account.id} hidden={hideMobileBell} />
      <main className="mx-auto flex w-full max-w-[82rem] flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
        {active && !isOnActiveRideScreen ? <ActiveRideBanner rideId={active.id} /> : null}
        <Outlet context={{ me, activeRide: active }} />
      </main>
      <MobileBottomNav accountId={me.account.id} name={name} />
    </div>
  )
}
