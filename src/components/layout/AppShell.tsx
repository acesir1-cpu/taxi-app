import { Outlet } from 'react-router-dom'
import { useMe } from '../../hooks/useMe'
import { useActiveRide } from '../../hooks/useActiveRide'
import { LoadingState } from '../common/LoadingState'
import { ActiveRideBanner } from './ActiveRideBanner'
import { MobileBottomNav } from './MobileBottomNav'
import { TopBar } from './TopBar'

export function AppShell() {
  const { data: me, isLoading } = useMe()
  const { data: active } = useActiveRide(me?.profile.id)

  if (isLoading || !me) {
    return (
      <div className="app-shell-atmosphere min-h-screen">
        <LoadingState />
      </div>
    )
  }

  const name = `${me.profile.firstName} ${me.profile.lastName}`

  return (
    <div className="app-shell-atmosphere min-h-screen pb-24 lg:pb-6">
      <TopBar accountId={me.account.id} name={name} />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
        {active ? <ActiveRideBanner rideId={active.id} /> : null}
        <Outlet context={{ me, activeRide: active }} />
      </main>
      <MobileBottomNav />
    </div>
  )
}
