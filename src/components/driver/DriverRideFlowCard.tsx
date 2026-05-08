import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Car, Check, Flag, Play } from 'lucide-react'
import { useState } from 'react'
import type { DriverRideFlowStatus, DriverUiState } from '../../types/domain'
import {
  driverCancelActiveRide,
  driverCompleteRide,
  driverMarkArrived,
  driverReportProblem,
  driverStartRideLeg,
  DRIVER_RIDE_STEP_LABELS,
} from '../../services/driverSessionApi'
import { strings } from '../../i18n/strings'
import { useDriverRideSummaryStore } from '../../store/driverRideSummaryStore'
import { useToastStore } from '../../store/notificationStore'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../ui/card'
import { cn } from '../../lib/utils'
import { CancelRideModal } from './CancelRideModal'
import { ProblemReportModal } from './ProblemReportModal'
function stepVisual(flow: DriverRideFlowStatus, index: number): 'done' | 'current' | 'todo' {
  const map: Record<DriverRideFlowStatus, { doneThrough: number; current: number }> = {
    prihvacena: { doneThrough: -1, current: 0 },
    vozac_na_putu: { doneThrough: 0, current: 1 },
    stigao: { doneThrough: 1, current: 2 },
    u_toku: { doneThrough: 2, current: 3 },
    zavrsena: { doneThrough: 4, current: 4 },
    otkazana: { doneThrough: -1, current: -1 },
    neuspjesna: { doneThrough: -1, current: -1 },
    problem: { doneThrough: -1, current: -1 },
  }
  const { doneThrough, current } = map[flow] ?? { doneThrough: 0, current: 0 }
  if (current < 0) return 'todo'
  if (index <= doneThrough) return 'done'
  if (index === current) return 'current'
  return 'todo'
}

function phaseVisual(flow: DriverRideFlowStatus, index: number): 'done' | 'current' | 'todo' {
  const currentPhase =
    flow === 'zavrsena'
      ? 2
      : flow === 'u_toku' || flow === 'stigao'
        ? 1
        : flow === 'prihvacena' || flow === 'vozac_na_putu'
          ? 0
          : -1
  if (currentPhase < 0) return 'todo'
  if (index < currentPhase) return 'done'
  if (index === currentPhase) return 'current'
  return 'todo'
}

export function DriverRideFlowCard({ accountId, ui }: { accountId: string; ui: DriverUiState }) {
  const t = strings()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const openRideSummary = useDriverRideSummaryStore((s) => s.openWith)
  const ride = ui.activeRide
  const [problemOpen, setProblemOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const arriveMut = useMutation({
    mutationFn: () => driverMarkArrived(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Stigli ste na lokaciju preuzimanja.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const startMut = useMutation({
    mutationFn: () => driverStartRideLeg(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Vožnja je pokrenuta.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const doneMut = useMutation({
    mutationFn: () => driverCompleteRide(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      openRideSummary({
        ...res.summary,
        payment: String(res.summary.payment),
      })
      push(t.notifications.driverRideSummaryToast, 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
      await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
    },
  })

  const problemMut = useMutation({
    mutationFn: (p: { type: Parameters<typeof driverReportProblem>[1]; description: string }) =>
      driverReportProblem(accountId, p.type, p.description),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Problem je poslan dispečeru.', 'success')
      setProblemOpen(false)
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const cancelMut = useMutation({
    mutationFn: (p: { reason: string; unjustified: boolean }) =>
      driverCancelActiveRide(accountId, p.reason, p.unjustified),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Vožnja je otkazana.', 'info')
      setCancelOpen(false)
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  if (!ride) {
    return (
      <Card className={cn(passengerAppCardClassName, 'border-dashed')}>
        <CardHeader>
          <CardTitle>Tok vožnje</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Nema aktivne vožnje. Prihvatite zahtjev da započnete tok.</p>
        </CardContent>
      </Card>
    )
  }

  const flow = ride.flowStatus
  const showArrived = flow === 'prihvacena' || flow === 'vozac_na_putu'
  const showStartRide = flow === 'stigao'
  const showComplete = flow === 'u_toku'

  return (
    <>
      <Card className={passengerAppCardClassName}>
        <CardHeader className="pb-2">
          <CardTitle>Tok vožnje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="grid grid-cols-3 gap-2">
            {['Preuzimanje', 'Vožnja', 'Završeno'].map((label, i) => {
              const st = phaseVisual(flow, i)
              return (
                <li key={label} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={cn(
                      'h-2.5 w-full rounded-full',
                      st === 'done' && 'bg-emerald-500',
                      st === 'current' && 'bg-brand-yellow',
                      st === 'todo' && 'bg-slate-200'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      st === 'current' ? 'text-brand-navy' : st === 'done' ? 'text-emerald-800' : 'text-slate-500'
                    )}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ol>
          <ol className="space-y-2">
            {DRIVER_RIDE_STEP_LABELS.map((label, i) => {
              const st = stepVisual(flow, i)
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      st === 'done' && 'bg-emerald-500 text-white',
                      st === 'current' && 'bg-brand-yellow text-brand-navy ring-2 ring-brand-yellow-dark/40',
                      st === 'todo' && 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {st === 'done' ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      st === 'current' ? 'text-brand-navy' : st === 'done' ? 'text-emerald-800' : 'text-slate-500'
                    )}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {showArrived ? (
              <Button variant="cta" className="h-11 min-h-[44px] w-full" onClick={() => arriveMut.mutate()} disabled={arriveMut.isPending}>
                <Flag className="mr-2 h-4 w-4" />
                Stigao na lokaciju
              </Button>
            ) : null}
            {showStartRide ? (
              <Button variant="cta" className="h-11 min-h-[44px] flex-1" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
                <Play className="mr-2 h-4 w-4" />
                Pokreni vožnju
              </Button>
            ) : null}
            {showComplete ? (
              <Button variant="cta" className="h-11 min-h-[44px] flex-1" onClick={() => doneMut.mutate()} disabled={doneMut.isPending}>
                <Car className="mr-2 h-4 w-4" />
                Završi vožnju
              </Button>
            ) : null}
            <Button variant="outline" className="min-h-11 flex-1" onClick={() => setProblemOpen(true)}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Prijavi problem
            </Button>
            <Button variant="outlineThin" className="min-h-11 flex-1 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setCancelOpen(true)}>
              Otkaži vožnju
            </Button>
          </div>
        </CardContent>
      </Card>
      <ProblemReportModal
        open={problemOpen}
        onOpenChange={setProblemOpen}
        loading={problemMut.isPending}
        onSend={(type, description) => problemMut.mutate({ type, description })}
      />
      <CancelRideModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        loading={cancelMut.isPending}
        onConfirm={(reason, unjustified) => cancelMut.mutate({ reason, unjustified })}
      />
    </>
  )
}
