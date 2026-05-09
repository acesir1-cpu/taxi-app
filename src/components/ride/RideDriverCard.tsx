import { Star } from 'lucide-react'
import type { AppMessages } from '../../i18n/strings'
import type { Driver, Vehicle } from '../../types/domain'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

type RideStrings = AppMessages['ride']

export function driverInitials(firstName: string, lastName: string): string {
  const first = (firstName || '').trim().charAt(0)
  const rawLast = (lastName || '').trim()
  const last = rawLast.charAt(0)
  return `${first}${first && last ? '.' : ''}${last}`.toUpperCase() || '?'
}

function formatDistanceToPickup(tr: RideStrings, distPickup: number): string {
  if (distPickup < 0.1) {
    return `~${(distPickup * 1000).toFixed(0)} ${tr.metersUnit} ${tr.nearYouSuffix}`
  }
  return `~${distPickup.toFixed(1)} ${tr.kmUnit} ${tr.nearYouSuffix}`
}

export function RideDriverCard({
  driver,
  vehicle,
  t,
  distPickup,
  variant = 'ridePage',
}: {
  driver: Driver
  vehicle: Vehicle
  t: AppMessages
  distPickup: number
  variant?: 'ridePage' | 'matchSheet'
}) {
  if (variant === 'matchSheet') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex gap-3">
          {driver.avatarUrl ? (
            <img
              src={driver.avatarUrl}
              alt={`${driver.firstName} ${driver.lastName}`}
              className="h-[52px] w-[52px] shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand-navy text-base font-extrabold text-white">
              {driverInitials(driver.firstName, driver.lastName)}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-base font-bold text-brand-navy">
              {driver.firstName} {driver.lastName}
            </p>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-sm font-semibold tabular-nums">{driver.rating.toFixed(1)}</span>
            </div>
            <p className="truncate text-sm text-slate-500">
              {vehicle.brand} {vehicle.model} · {vehicle.registration}
            </p>
            <p className="text-sm text-slate-600">{formatDistanceToPickup(t.ride, distPickup)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.ride.driverVehicleTitle}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="flex items-center gap-3">
          {driver.avatarUrl ? (
            <img
              src={driver.avatarUrl}
              alt={`${driver.firstName} ${driver.lastName}`}
              className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-extrabold text-white">
              {driverInitials(driver.firstName, driver.lastName)}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <p className="truncate font-semibold text-brand-navy">
              {driver.firstName} {driver.lastName} · ⭐ {driver.rating.toFixed(1)}
            </p>
            <p className="truncate text-slate-600">
              {vehicle.brand} {vehicle.model} · {vehicle.registration}
            </p>
            <p className="text-slate-500">
              {t.ride.distanceToYou}{' '}
              {distPickup < 0.1
                ? `${(distPickup * 1000).toFixed(0)} ${t.ride.metersUnit}`
                : `${distPickup.toFixed(2)} ${t.ride.kmUnit}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
