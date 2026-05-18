import { Droplets, Star, TrendingUp, Wallet } from 'lucide-react'
import type { DriverUiState, DriverUserProfile } from '../../types/domain'
import { Card, CardContent, passengerAppCardClassName } from '../ui/card'
import { cn } from '../../lib/utils'
import { driverBrand } from './driverUi'

export function DriverStatsStrip({ profile, ui }: { profile: DriverUserProfile; ui: DriverUiState }) {
  const lowRating = profile.rating < 4.5
  const ridesTodayDisplay = ui.ridesToday + (ui.activeRide ? 1 : 0)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className={passengerAppCardClassName}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-navy/5">
            <TrendingUp className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <p className="text-xs font-semibold leading-snug tracking-wide text-slate-600">Danas · vožnje</p>
            <p className="text-xl font-bold text-brand-navy">{ridesTodayDisplay}</p>
          </div>
        </CardContent>
      </Card>
      <Card className={passengerAppCardClassName}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', driverBrand.earningsIconWrap)}>
            <Wallet className={cn('h-5 w-5', driverBrand.earningsIcon)} />
          </div>
          <div>
            <p className="text-xs font-semibold leading-snug tracking-wide text-slate-600">Zarada danas</p>
            <p className="text-xl font-bold text-brand-navy">{ui.earningsTodayBam.toFixed(2)} BAM</p>
          </div>
        </CardContent>
      </Card>
      <Card className={passengerAppCardClassName}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-yellow/15">
            <Star className="h-5 w-5 text-brand-yellow-dark" />
          </div>
          <div>
            <p className="text-xs font-semibold leading-snug tracking-wide text-slate-600">Ocjena</p>
            <p className={lowRating ? 'text-xl font-bold text-brand-yellow-dark' : 'text-xl font-bold text-brand-navy'}>
              {profile.rating.toFixed(1)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className={passengerAppCardClassName}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', driverBrand.fuelIconWrap)}>
            <Droplets className={cn('h-5 w-5', driverBrand.fuelIcon)} />
          </div>
          <div>
            <p className="text-xs font-semibold leading-snug tracking-wide text-slate-600">Procjena goriva</p>
            <p className="text-xl font-bold text-brand-navy">{ui.fuelPercent}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
