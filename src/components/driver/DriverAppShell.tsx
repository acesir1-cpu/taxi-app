import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useMe } from '../../hooks/useMe'
import { useLangRefresh } from '../../hooks/useLangRefresh'
import { strings } from '../../i18n/strings'
import { useDriverRideSummaryStore } from '../../store/driverRideSummaryStore'
import { LoadingState } from '../common/LoadingState'
import { MobileFloatingNotifications } from '../layout/MobileFloatingNotifications'
import { DriverMobileNav } from './DriverMobileNav'
import { DriverTopBar } from './DriverTopBar'
import { RideCompleteSummaryModal } from './RideCompleteSummaryModal'
import type { DriverOutletContext } from '../../types/appContext'

export function DriverAppShell() {
  useLangRefresh()
  const t = strings()
  const location = useLocation()
  const { data: me, isLoading } = useMe()
  const summaryOpen = useDriverRideSummaryStore((s) => s.open)
  const summary = useDriverRideSummaryStore((s) => s.summary)
  const closeSummary = useDriverRideSummaryStore((s) => s.close)

  useEffect(() => {
    document.body.classList.add('app-mobile-nav')
    return () => {
      document.body.classList.remove('app-mobile-nav')
    }
  }, [])

  if (isLoading || !me || me.kind !== 'driver') {
    return (
      <div className="app-shell-atmosphere min-h-screen">
        <LoadingState />
      </div>
    )
  }

  const ctx: DriverOutletContext = { me }
  const hideMobileBell = location.pathname === '/driver/settings'

  return (
    <div className="app-shell-atmosphere min-h-screen pb-24 lg:pb-6">
      <div className="pointer-events-none fixed bottom-2 left-2 z-50">
        <span className="rounded-full border border-brand-navy/15 bg-brand-navy px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
          {t.common.appVersionBadge}
        </span>
      </div>
      <DriverTopBar
        accountId={me.account.id}
        name={me.driverProfile.fullName}
        linkedDriverId={me.driverProfile.linkedDriverId}
      />
      <MobileFloatingNotifications accountId={me.account.id} appRole="driver" hidden={hideMobileBell} />
      <main className="mx-auto flex w-full max-w-[82rem] flex-col gap-6 px-4 py-6 sm:px-6">
        <Outlet context={ctx} />
      </main>
      <DriverMobileNav />
      <RideCompleteSummaryModal
        open={summaryOpen}
        onOpenChange={(v) => {
          if (!v) closeSummary()
        }}
        summary={summary}
      />
    </div>
  )
}
