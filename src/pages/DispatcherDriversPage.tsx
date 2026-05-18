import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CarFront, MapPin, ShieldAlert, Star, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoadingState } from '../components/common/LoadingState'
import { DriverStatusPill, formatDispatchDateTime } from '../components/dispatch/dispatchUi'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { strings } from '../i18n/strings'
import { dispatchToastMessage } from '../lib/dispatchToast'
import { cn } from '../lib/utils'
import { dispatcherCan, forceDriverStatus } from '../services/dispatcherApi'
import { useToastStore } from '../store/notificationStore'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import type { DriverAvailability } from '../types/domain'

export function DispatcherDriversPage() {
  useLangRefresh()
  const t = strings()
  const d = t.dispatcher.drivers
  const toast = t.dispatcher.toast
  const { me } = useDispatcherSession()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [filter, setFilter] = useState<DriverAvailability | 'svi'>('svi')
  const { data, isPending } = useDispatchData()
  const canForce = dispatcherCan(me.dispatcherProfile.roleLevel, 'force_driver_status')

  const statuses: Array<{ value: DriverAvailability | 'svi'; label: string }> = [
    { value: 'svi', label: d.filterAll },
    { value: 'dostupan', label: d.filterAvailable },
    { value: 'zauzet', label: d.filterBusy },
    { value: 'na_pauzi', label: d.filterBreak },
    { value: 'van_smjene', label: d.filterOffShift },
    { value: 'van_funkcije', label: d.filterOutOfService },
  ]

  const forceMut = useMutation({
    mutationFn: (p: { driverId: string; status: DriverAvailability }) => forceDriverStatus(me.account.id, p.driverId, p.status),
    onSuccess: async (res) => {
      if ('error' in res) push(dispatchToastMessage(res.error, t), 'error')
      else push(toast.driverStatusChanged, 'success')
      await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
    },
  })

  useEffect(() => {
    const param = searchParams.get('filter')
    const allowed: Array<DriverAvailability | 'svi'> = ['svi', 'dostupan', 'zauzet', 'na_pauzi', 'van_smjene', 'van_funkcije']
    if (param && allowed.includes(param as DriverAvailability | 'svi')) {
      setFilter(param as DriverAvailability | 'svi')
    }
  }, [searchParams])

  const drivers = useMemo(() => {
    if (!data) return []
    return filter === 'svi' ? data.drivers : data.drivers.filter((row) => row.driver.availabilityStatus === filter)
  }, [data, filter])

  if (isPending && !data) return <LoadingState />

  const forceLabels: Record<DriverAvailability, string> = {
    dostupan: d.forceAvailable,
    zauzet: d.filterBusy,
    na_pauzi: d.forceBreak,
    van_smjene: d.forceOffShift,
    van_funkcije: d.forceOutOfService,
  }

  return (
    <div className="space-y-5">
      <Card className={passengerAppCardClassName}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {d.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
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

          <div className="grid gap-4 lg:grid-cols-2">
            {drivers.map((row) => (
              <div key={row.driver.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-brand-navy">
                      {row.driver.firstName} {row.driver.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{row.driver.phone}</p>
                  </div>
                  <DriverStatusPill status={row.driver.availabilityStatus} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoLine
                    icon={<CarFront className="h-4 w-4" />}
                    label={d.vehicle}
                    value={row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model} · ${row.vehicle.registration}` : d.noVehicle}
                  />
                  <InfoLine icon={<MapPin className="h-4 w-4" />} label={d.zone} value={row.zoneLabel} />
                  <InfoLine
                    icon={<Star className="h-4 w-4" />}
                    label={d.rating}
                    value={d.ratingCount.replace('{rating}', row.driver.rating.toFixed(1)).replace('{count}', String(row.driver.totalRatings))}
                  />
                  <InfoLine icon={<ShieldAlert className="h-4 w-4" />} label={d.gps} value={formatDispatchDateTime(row.lastGpsAt)} />
                </div>

                {row.activeRide ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    {d.activeRide.replace(
                      '{route}',
                      `${row.activeRide.pickup.label} → ${row.activeRide.destination.label}`,
                    )}
                  </div>
                ) : null}
                {row.warning ? <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{row.warning}</div> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {(['dostupan', 'na_pauzi', 'van_smjene', 'van_funkcije'] as DriverAvailability[]).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={status === 'van_funkcije' ? 'outlineThin' : 'secondary'}
                      disabled={!canForce || forceMut.isPending}
                      onClick={() => forceMut.mutate({ driverId: row.driver.id, status })}
                    >
                      {forceLabels[status]}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!canForce ? (
            <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{d.forceLocked}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-brand-navy">{value}</p>
    </div>
  )
}
