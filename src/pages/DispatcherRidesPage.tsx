import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Car, PhoneCall, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AiEstimatePanel } from '../components/common/AiEstimatePanel'
import { LoadingState } from '../components/common/LoadingState'
import { DispatcherRideAssignPanel } from '../components/dispatch/DispatcherRideAssignPanel'
import { DispatchStatusBadge, formatDispatchDateTime } from '../components/dispatch/dispatchUi'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAiRouteEstimate } from '../hooks/useAiRouteEstimate'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { strings } from '../i18n/strings'
import { dispatchToastMessage } from '../lib/dispatchToast'
import { cn } from '../lib/utils'
import { createManualRideRequest, getDispatchLocations } from '../services/dispatcherApi'
import { useToastStore } from '../store/notificationStore'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import type { Location, OrderType } from '../types/domain'

type RideFilter = 'sve' | 'aktivne' | 'cekaju' | 'problem' | 'zavrsene'

const RIDE_FILTERS = new Set<RideFilter>(['sve', 'aktivne', 'cekaju', 'problem', 'zavrsene'])

function isAwaitingAssignment(row: { ride: unknown; request: { status: string } }): boolean {
  return !row.ride && ['kreiran', 'u_obradi'].includes(row.request.status)
}

export function DispatcherRidesPage() {
  useLangRefresh()
  const t = strings()
  const r = t.dispatcher.rides
  const ai = t.dispatcher.ai
  const c = t.dispatcher.common
  const toast = t.dispatcher.toast
  const { me } = useDispatcherSession()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const locations = useMemo(() => getDispatchLocations(), [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RideFilter>('sve')
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [passengerName, setPassengerName] = useState<string>(c.phonePassengerDefault)
  const [passengerPhone, setPassengerPhone] = useState('+38761111998')
  const [pickupId, setPickupId] = useState(locations[0]?.id ?? '')
  const [destinationId, setDestinationId] = useState(locations[4]?.id ?? locations[1]?.id ?? '')
  const [orderType, setOrderType] = useState<OrderType>('odmah')
  const [scheduledAt, setScheduledAt] = useState('')
  const { data, isPending } = useDispatchData()

  const phonePickup = useMemo(() => locations.find((loc) => loc.id === pickupId), [locations, pickupId])
  const phoneDestination = useMemo(
    () => locations.find((loc) => loc.id === destinationId),
    [locations, destinationId],
  )
  const phoneAiQ = useAiRouteEstimate(phonePickup, phoneDestination, {
    availableDrivers: data?.kpis.availableDrivers ?? 0,
    orderType,
    scheduledAt: orderType === 'zakazano' ? scheduledAt : undefined,
  })
  const phoneAiEstimate = phoneAiQ.data && !('error' in phoneAiQ.data) ? phoneAiQ.data : null
  const phoneAiError = phoneAiQ.data && 'error' in phoneAiQ.data ? phoneAiQ.data.error : null

  const rideFilters: Array<{ value: RideFilter; label: string }> = [
    { value: 'sve', label: r.filterAll },
    { value: 'aktivne', label: r.filterActive },
    { value: 'cekaju', label: r.filterWaiting },
    { value: 'problem', label: r.filterProblem },
    { value: 'zavrsene', label: r.filterDone },
  ]

  const waitingCount = useMemo(
    () => (data?.rides.filter(isAwaitingAssignment).length ?? 0),
    [data],
  )

  const selectedRow = useMemo(
    () => data?.rides.find((row) => row.request.id === selectedRequestId) ?? null,
    [data, selectedRequestId],
  )

  const createMut = useMutation({
    mutationFn: () => {
      const pickup = locations.find((loc) => loc.id === pickupId)
      const destination = locations.find((loc) => loc.id === destinationId)
      if (!pickup || !destination) throw new Error('missing_location')
      return createManualRideRequest({
        dispatcherAccountId: me.account.id,
        passengerName,
        passengerPhone,
        pickup,
        destination,
        orderType,
        scheduledAt: orderType === 'zakazano' ? scheduledAt : undefined,
      })
    },
    onSuccess: async (res) => {
      if ('error' in res) {
        push(dispatchToastMessage(res.error, t), 'error')
        return
      }
      setSelectedRequestId(res.request.id)
      push(toast.phoneRequestCreated, 'success')
      await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
    },
  })

  const rows = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.rides.filter((row) => {
      const matchesQuery =
        !q ||
        row.passengerName.toLowerCase().includes(q) ||
        row.passengerPhone.toLowerCase().includes(q) ||
        row.pickupLabel.toLowerCase().includes(q) ||
        row.destinationLabel.toLowerCase().includes(q) ||
        row.driverName?.toLowerCase().includes(q)
      if (!matchesQuery) return false
      if (filter === 'aktivne') return row.ride && ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku'].includes(row.ride.status)
      if (filter === 'cekaju') return isAwaitingAssignment(row)
      if (filter === 'problem') return ['problematicna', 'neuspjesna', 'neuspjesan', 'otkazana', 'otkazan'].includes(row.status)
      if (filter === 'zavrsene') return row.status === 'zavrsena'
      return true
    })
  }, [data, filter, query])

  useEffect(() => {
    const param = searchParams.get('filter')
    if (param && RIDE_FILTERS.has(param as RideFilter)) {
      setFilter(param as RideFilter)
    }
  }, [searchParams])

  useEffect(() => {
    if (!data || filter !== 'cekaju') return
    const first = data.rides.find(isAwaitingAssignment)
    if (first) setSelectedRequestId(first.request.id)
  }, [filter, data])

  useEffect(() => {
    if (location.hash !== '#phone-order') return
    const el = document.getElementById('dispatch-phone-order')
    if (!el) return
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [location.hash, data])

  if (isPending && !data) return <LoadingState />

  function locationById(id: string): Location | undefined {
    return locations.find((loc) => loc.id === id)
  }

  function selectRow(requestId: string) {
    setSelectedRequestId(requestId)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="space-y-4">
        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Car className="h-5 w-5" />
              {r.title}
            </CardTitle>
            <p className="text-sm text-slate-600">{r.pageHint}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {waitingCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-yellow/50 bg-brand-yellow/15 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-bold text-brand-navy">
                  <AlertCircle className="h-4 w-4 shrink-0 text-brand-teal" />
                  {r.waitingBanner.replace('{count}', String(waitingCount))}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFilter('cekaju')
                  }}
                >
                  {r.filterWaiting}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={r.searchPlaceholder} />
              </div>
              <div className="flex flex-wrap gap-2">
                {rideFilters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={cn(
                      'rounded-xl border px-3 py-2 text-xs font-bold transition',
                      filter === item.value ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-700 hover:text-brand-navy',
                    )}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_0.9fr_0.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                <span>{r.colPassenger}</span>
                <span>{r.colRoute}</span>
                <span>{r.colDriver}</span>
                <span>{r.colStatus}</span>
                <span className="text-right">{r.colAction}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">{t.dispatcher.dashboard.noRidesForFilter}</p>
                ) : (
                  rows.map((row) => {
                    const awaiting = isAwaitingAssignment(row)
                    const selected = selectedRequestId === row.request.id
                    return (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'grid cursor-pointer gap-3 px-4 py-4 text-sm transition lg:grid-cols-[1.2fr_1.5fr_1fr_0.9fr_0.8fr] lg:items-center',
                          selected && 'bg-brand-yellow/10 ring-2 ring-inset ring-brand-yellow/60',
                          awaiting && !selected && 'border-l-4 border-l-brand-yellow',
                        )}
                        onClick={() => selectRow(row.request.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            selectRow(row.request.id)
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-brand-navy">{row.passengerName}</p>
                          <p className="truncate text-xs text-slate-500">{row.passengerPhone}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {row.pickupLabel} → {row.destinationLabel}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDispatchDateTime(row.createdAt)} · {row.distanceKm.toFixed(1)} km · {row.estimatedPrice.toFixed(2)} BAM
                            {awaiting ? (
                              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                                {ai.listAiTag}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-700">{row.driverName ?? c.unassigned}</p>
                          <p className="truncate text-xs text-slate-500">{row.vehicleLabel ?? c.awaitingDispatch}</p>
                        </div>
                        <DispatchStatusBadge status={row.status} />
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {awaiting ? (
                            <Button
                              size="sm"
                              variant={selected ? 'cta' : 'secondary'}
                              onClick={() => selectRow(row.request.id)}
                            >
                              {c.assign}
                            </Button>
                          ) : null}
                          <Button size="sm" variant="outlineThin" asChild>
                            <Link to={`/dispatch/rides/${row.ride?.id ?? row.request.id}`}>{c.details}</Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <DispatcherRideAssignPanel
          dispatcherAccountId={me.account.id}
          selectedRow={selectedRow}
          availableDrivers={data?.kpis.availableDrivers ?? 0}
          onClearSelection={() => setSelectedRequestId('')}
          onAssigned={() => {
            void qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
          }}
        />

        <Card id="dispatch-phone-order" className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PhoneCall className="h-5 w-5" />
              {r.phoneSectionTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>{r.passengerName}</Label>
              <Input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{r.phone}</Label>
              <Input value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{r.pickup}</Label>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-brand-navy" value={pickupId} onChange={(e) => setPickupId(e.target.value)}>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{r.destination}</Label>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-brand-navy" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['odmah', 'zakazano'] as OrderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-bold',
                    orderType === type ? 'border-brand-yellow bg-brand-yellow/30 text-brand-navy' : 'border-slate-200 bg-white text-slate-600',
                  )}
                  onClick={() => setOrderType(type)}
                >
                  {type === 'odmah' ? c.immediate : c.scheduled}
                </button>
              ))}
            </div>
            {orderType === 'zakazano' ? (
              <div className="space-y-1.5">
                <Label>{r.departAt}</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            ) : null}
            <AiEstimatePanel
              estimate={phoneAiEstimate}
              isLoading={phoneAiQ.isFetching && !phoneAiEstimate}
              errorKey={phoneAiError}
              variant="compact"
            />
            <p className="text-xs font-medium text-violet-700/90">{ai.phoneHint}</p>
            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              {locationById(pickupId)?.label} → {locationById(destinationId)?.label}
            </div>
            <Button className="w-full" variant="cta" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
              <Plus className="h-4 w-4" />
              {r.createRequest}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
