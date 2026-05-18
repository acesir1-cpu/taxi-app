import { AlertTriangle, Coffee, Play, Square } from 'lucide-react'
import type { DriverUiState } from '../../types/domain'
import { driverAvailabilityLabel } from '../../services/driverSessionApi'
import { useDriverShiftMutations } from '../../hooks/useDriverShiftMutations'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../ui/card'
import { cn } from '../../lib/utils'
import { driverAvailabilityDotClass, driverBrand } from './driverUi'

export function DriverStatusCard({ accountId, ui }: { accountId: string; ui: DriverUiState }) {
  const { startMut, pauseMut, resumeMut, endMut } = useDriverShiftMutations(accountId)

  const busy = ui.availabilityStatus === 'zauzet' && !!ui.activeRide
  const vanF = ui.availabilityStatus === 'van_funkcije'
  const online = ui.availabilityStatus !== 'van_smjene' && ui.availabilityStatus !== 'van_funkcije'
  const onlineLabel = online ? 'Na mreži' : 'Van smjene'

  return (
    <Card className={passengerAppCardClassName}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Status vozača</span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span
              className={cn(
                'inline-flex h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow-sm',
                driverAvailabilityDotClass(ui.availabilityStatus),
                online && 'animate-pulse'
              )}
              title={driverAvailabilityLabel(ui.availabilityStatus)}
            />
            <span>{onlineLabel}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Trenutni status</p>
          <p className="text-2xl font-bold text-brand-navy">{driverAvailabilityLabel(ui.availabilityStatus)}</p>
        </div>

        {vanF ? (
          <div className={cn('flex gap-2 rounded-2xl border px-3 py-2 text-sm', driverBrand.alertDanger)}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
            <p>Van funkcije — potrebna intervencija dispečera ili administratora prije nastavka rada.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {ui.availabilityStatus === 'van_smjene' ? (
            <Button variant="cta" className="h-11 w-full min-h-[44px]" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Započni smjenu
            </Button>
          ) : null}

          {ui.availabilityStatus === 'dostupan' ? (
            <>
              <Button className="min-h-11 flex-1 sm:flex-none" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending}>
                <Coffee className="mr-2 h-4 w-4" />
                Pauza
              </Button>
              <Button
                variant="outline"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => endMut.mutate()}
                disabled={endMut.isPending || busy}
              >
                <Square className="mr-2 h-4 w-4" />
                Završi smjenu
              </Button>
            </>
          ) : null}

          {ui.availabilityStatus === 'na_pauzi' ? (
            <>
              <Button variant="cta" className="h-11 min-h-[44px] flex-1 sm:flex-none" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
                Nastavi
              </Button>
              <Button
                variant="outline"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => endMut.mutate()}
                disabled={endMut.isPending}
              >
                Završi smjenu
              </Button>
            </>
          ) : null}

          {ui.availabilityStatus === 'zauzet' ? (
            <p className="w-full text-sm text-slate-600">
              Zauzet ste vožnjom. Završite ili otkažite vožnju prije završetka smjene.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
