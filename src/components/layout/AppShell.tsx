import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useMe } from '../../hooks/useMe'
import { useActiveRide } from '../../hooks/useActiveRide'
import { useLangRefresh } from '../../hooks/useLangRefresh'
import { hasCompletedPassengerAppTour } from '../../lib/passengerAppTourStorage'
import { loadPassengerProfileExtras } from '../../lib/passengerSettingsPrefs'
import { strings } from '../../i18n/strings'
import { LoadingState } from '../common/LoadingState'
import { PassengerAppTour } from '../onboarding/PassengerAppTour'
import { PassengerHomeAddressModal } from '../onboarding/PassengerHomeAddressModal'
import { ActiveRideBanner } from './ActiveRideBanner'
import { MobileFloatingNotifications } from './MobileFloatingNotifications'
import { MobileBottomNav } from './MobileBottomNav'
import { TopBar } from './TopBar'

export function AppShell() {
  useLangRefresh()
  const t = strings()
  const location = useLocation()
  const { data: me, isLoading } = useMe()
  const passengerAccountId = me?.kind === 'passenger' ? me.account.id : ''
  const { data: active } = useActiveRide(me?.kind === 'passenger' ? me.profile.id : undefined)

  const [homeAddressModalOpen, setHomeAddressModalOpen] = useState(false)
  const [appTourOpen, setAppTourOpen] = useState(false)

  useEffect(() => {
    document.body.classList.add('app-mobile-nav')
    return () => {
      document.body.classList.remove('app-mobile-nav')
    }
  }, [])

  useEffect(() => {
    if (!passengerAccountId) return
    const ex = loadPassengerProfileExtras(passengerAccountId)
    const needHomePrompt = !ex.homeAddressOnboardingDismissed
    setHomeAddressModalOpen(needHomePrompt)
    setAppTourOpen(Boolean(ex.homeAddressOnboardingDismissed && !hasCompletedPassengerAppTour(passengerAccountId)))
  }, [passengerAccountId])

  if (isLoading || !me || me.kind !== 'passenger') {
    return (
      <div className="app-shell-atmosphere min-h-screen">
        <LoadingState />
      </div>
    )
  }

  const name = `${me.profile.firstName} ${me.profile.lastName}`

  function onHomeAddressModalClose() {
    setHomeAddressModalOpen(false)
    if (passengerAccountId && !hasCompletedPassengerAppTour(passengerAccountId)) {
      setAppTourOpen(true)
    }
  }

  const isOnActiveRideScreen = location.pathname === '/app/active' || location.pathname.startsWith('/app/ride/')
  /** Match confirmation lives on SearchingPage; banner would duplicate “go to ride” before user confirms. */
  const isOnSearching = location.pathname === '/app/searching'
  const hideMobileBell = location.pathname === '/app/profile'
  const orderMapMobileLayout = location.pathname === '/app/order'
  const rideMapMobileLayout = isOnActiveRideScreen

  return (
    <div className="app-shell-atmosphere min-h-screen pb-24 lg:pb-6">
      <div className="pointer-events-none fixed bottom-2 left-2 z-50">
        <span className="rounded-full border border-brand-navy/15 bg-brand-navy px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
          {t.common.appVersionBadge}
        </span>
      </div>
      <TopBar accountId={me.account.id} name={name} />
      <MobileFloatingNotifications
        accountId={me.account.id}
        appRole="passenger"
        hidden={hideMobileBell}
        layout={orderMapMobileLayout || rideMapMobileLayout ? 'orderMap' : 'default'}
      />
      <main
        className={cn(
          'mx-auto flex w-full max-w-[82rem] flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6',
          (orderMapMobileLayout || rideMapMobileLayout) && 'max-lg:gap-0 max-lg:px-0 max-lg:py-0'
        )}
      >
        {active && !isOnActiveRideScreen && !isOnSearching ? (
          <div className={cn((orderMapMobileLayout || rideMapMobileLayout) && 'relative z-[62]')}>
            <ActiveRideBanner rideId={active.id} />
          </div>
        ) : null}
        <Outlet context={{ me, activeRide: active }} />
      </main>
      <MobileBottomNav accountId={me.account.id} name={name} />
      <PassengerHomeAddressModal
        open={homeAddressModalOpen}
        accountId={me.account.id}
        onClose={onHomeAddressModalClose}
      />
      {appTourOpen && !homeAddressModalOpen ? (
        <PassengerAppTour accountId={me.account.id} onComplete={() => setAppTourOpen(false)} />
      ) : null}
    </div>
  )
}
