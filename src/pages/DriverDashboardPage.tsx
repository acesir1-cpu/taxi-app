import { useOutletContext } from 'react-router-dom'
import { LoadingState } from '../components/common/LoadingState'
import { DriverActivityLogCard } from '../components/driver/DriverActivityLogCard'
import { DriverDemoPanel } from '../components/driver/DriverDemoPanel'
import { DriverMapPanel } from '../components/driver/DriverMapPanel'
import { DriverNewRideCard } from '../components/driver/DriverNewRideCard'
import { DriverRideFlowCard } from '../components/driver/DriverRideFlowCard'
import { DriverStatsStrip } from '../components/driver/DriverStatsStrip'
import { DriverStatusCard } from '../components/driver/DriverStatusCard'
import { useDriverUi } from '../hooks/useDriverUi'
import type { DriverOutletContext } from '../types/appContext'

export function DriverDashboardPage() {
  const { me } = useOutletContext<DriverOutletContext>()
  const { data: ui, isLoading } = useDriverUi(me.account.id)

  if (isLoading || !ui) {
    return <LoadingState />
  }
  const isBusy = ui.availabilityStatus === 'zauzet'

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-7 lg:row-start-1">
        <DriverStatusCard accountId={me.account.id} ui={ui} />
      </div>
      <div className="lg:col-span-5 lg:row-span-2 lg:row-start-1">
        <DriverMapPanel accountId={me.account.id} ui={ui} />
      </div>
      <div className="space-y-4 lg:col-span-7 lg:row-start-2">
        {!isBusy ? <DriverNewRideCard accountId={me.account.id} ui={ui} /> : null}
        <DriverRideFlowCard accountId={me.account.id} ui={ui} />
        <DriverStatsStrip profile={me.driverProfile} ui={ui} />
        <DriverActivityLogCard ui={ui} />
        <DriverDemoPanel accountId={me.account.id} />
      </div>
    </div>
  )
}
