import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
const DispatchFleetMap = lazy(() =>
  import('../components/dispatch/DispatchFleetMap').then((m) => ({ default: m.DispatchFleetMap })),
)
import { DispatchAiOpsBanner } from '../components/dispatch/DispatchAiOpsBanner'
import { DispatchQuickLinks } from '../components/dispatch/DispatchQuickLinks'
import { DispatchStatusBadge, DriverStatusPill, formatDispatchDateTime } from '../components/dispatch/dispatchUi'
import { LoadingState } from '../components/common/LoadingState'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { strings } from '../i18n/strings'
import { cn } from '../lib/utils'
import { dispatchAnomalyLink } from '../lib/dispatchAnomalyLink'
import { acknowledgeAnomaly, isDispatchRideAwaitingAssignment } from '../services/dispatcherApi'
import { useDispatcherSession } from '../hooks/useDispatcherSession'

type DashboardFilter = 'sve' | 'problematicne' | 'bez_voznje' | 'dostupan' | 'zauzet' | 'van_funkcije'

export function DispatcherDashboardPage() {
  useLangRefresh()
  const t = strings()
  const d = t.dispatcher.dashboard
  const c = t.dispatcher.common
  const { me } = useDispatcherSession()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<DashboardFilter>('sve')
  const { data, isPending } = useDispatchData()

  const filters: Array<{ value: DashboardFilter; label: string }> = [
    { value: 'sve', label: d.filterAll },
    { value: 'problematicne', label: d.filterProblemRides },
    { value: 'bez_voznje', label: d.filterDriversNoRide },
    { value: 'dostupan', label: d.filterAvailable },
    { value: 'zauzet', label: d.filterBusy },
    { value: 'van_funkcije', label: d.filterOutOfService },
  ]

  const ackMut = useMutation({
    mutationFn: (id: string) => acknowledgeAnomaly(me.account.id, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
    },
  })

  const filteredDrivers = useMemo(() => {
    if (!data) return []
    if (filter === 'bez_voznje') return data.drivers.filter((row) => !row.activeRide)
    if (filter === 'dostupan' || filter === 'zauzet' || filter === 'van_funkcije') {
      return data.drivers.filter((row) => row.driver.availabilityStatus === filter)
    }
    return data.drivers
  }, [data, filter])

  const waitingCount = useMemo(
    () => (data?.rides.filter(isDispatchRideAwaitingAssignment).length ?? 0),
    [data],
  )

  const filteredRides = useMemo(() => {
    if (!data) return []
    if (filter === 'problematicne') {
      return data.rides.filter((row) => row.status === 'problematicna' || row.status === 'neuspjesna' || row.status === 'neuspjesan')
    }
    return data.rides.filter((row) => row.ride && ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'problematicna'].includes(row.ride.status))
  }, [data, filter])

  if (isPending && !data) return <LoadingState />
  if (!data) return <LoadingState />

  const openAnomalies = data.anomalies.filter((item) => !item.acknowledged)
  const liveLabel = c.liveAt.replace('{time}', formatDispatchDateTime(data.generatedAt))

  return (
    <div className="space-y-5">
      <DispatchQuickLinks kpis={data.kpis} waitingCount={waitingCount} />

      <DispatchAiOpsBanner />

      <section className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(
              'rounded-xl border px-3 py-2 text-xs font-bold transition',
              filter === item.value
                ? 'border-brand-navy bg-brand-navy text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-brand-navy',
            )}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.9fr)]">
        <Suspense fallback={<div className="min-h-[520px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />}>
          <DispatchFleetMap drivers={filteredDrivers} rides={filteredRides} className="min-h-[520px]" />
        </Suspense>

        <div className="space-y-5">
          <Card className={passengerAppCardClassName}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
                <span>{d.anomaliesTitle}</span>
                <span className="flex items-center gap-3 text-xs font-semibold">
                  <Link to="/dispatch/problems" className="font-bold text-brand-teal hover:underline">
                    {d.viewAll}
                  </Link>
                  <span className="text-slate-500">{liveLabel}</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openAnomalies.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                  {d.noAnomalies}
                </div>
              ) : (
                openAnomalies.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={dispatchAnomalyLink(item)} className="min-w-0 flex-1 rounded-lg outline-none ring-brand-teal/40 hover:opacity-90 focus-visible:ring-2">
                        <p className={cn('font-bold', item.severity === 'danger' ? 'text-red-700' : 'text-amber-800')}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-teal">
                          {d.openItem}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">{formatDispatchDateTime(item.createdAt)}</p>
                      </Link>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <Button variant="secondary" size="sm" disabled={ackMut.isPending} onClick={() => ackMut.mutate(item.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {c.confirm}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={passengerAppCardClassName}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <span>{d.activeRidesTitle}</span>
                <Link to="/dispatch/rides?filter=aktivne" className="text-xs font-bold text-brand-teal hover:underline">
                  {d.viewAll}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredRides.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">{d.noRidesForFilter}</p>
              ) : (
                filteredRides.slice(0, 7).map((row) => (
                  <Link
                    key={row.id}
                    to={`/dispatch/rides/${row.ride?.id ?? row.request.id}`}
                    className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm transition hover:border-brand-teal/30 hover:bg-brand-teal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 font-bold text-brand-navy">
                        {row.pickupLabel} → {row.destinationLabel}
                      </p>
                      <DispatchStatusBadge status={row.status} />
                    </div>
                    <p className="text-slate-600">
                      {row.passengerName} · {row.driverName ?? c.noDriver}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={passengerAppCardClassName}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <span>{d.driversTitle}</span>
                <Link to="/dispatch/drivers" className="text-xs font-bold text-brand-teal hover:underline">
                  {d.viewAll}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredDrivers.slice(0, 7).map((row) => (
                <Link
                  key={row.driver.id}
                  to={`/dispatch/drivers?filter=${row.driver.availabilityStatus}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm transition hover:border-brand-teal/30 hover:bg-brand-teal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-brand-navy">
                      {row.driver.firstName} {row.driver.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{row.zoneLabel}</p>
                  </div>
                  <DriverStatusPill status={row.driver.availabilityStatus} />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
