import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import {
  driverDemoForcePhase,
  driverSetDebtDemo,
  driverSetGpsUnavailableDemo,
  driverSetLicenseExpiredDemo,
  driverSetSuspendedDemo,
  driverSimulateNewRequest,
  resetDriverDemo,
  type DriverDemoForcePhase,
} from '../../services/driverSessionApi'
import { demoGlassDividerClass, demoGlassPanelClass } from '../../lib/demoGlassPanel'
import { cn } from '../../lib/utils'
import { useDriverUi } from '../../hooks/useDriverUi'
import { useDriverSimStore } from '../../store/driverSimStore'
import { useDriverRideSummaryStore } from '../../store/driverRideSummaryStore'
import { useToastStore } from '../../store/notificationStore'
import { strings } from '../../i18n/strings'
import { Button } from '../ui/button'

export function DriverDemoPanel({ accountId }: { accountId: string }) {
  const t = strings()
  const [foldOpen, setFoldOpen] = useState(false)
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const openRideSummary = useDriverRideSummaryStore((s) => s.openWith)
  const { data: ui } = useDriverUi(accountId)
  const activeRide = ui?.activeRide ?? null
  const simSpeed = useDriverSimStore((s) => s.simSpeed)
  const setSimSpeed = useDriverSimStore((s) => s.setSimSpeed)

  const inv = async () => {
    await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    await qc.invalidateQueries({ queryKey: ['me'] })
  }

  const simReq = useMutation({
    mutationFn: () => driverSimulateNewRequest(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Novi zahtjev je dodijeljen.', 'success')
      await inv()
    },
  })

  const reset = useMutation({
    mutationFn: () => resetDriverDemo(accountId),
    onSuccess: async () => {
      push('Podaci su vraćeni na početno stanje.', 'success')
      await inv()
    },
  })

  const gps = useMutation({
    mutationFn: (v: boolean) => driverSetGpsUnavailableDemo(accountId, v),
    onSuccess: async (_, v) => {
      push(v ? 'GPS lokacija trenutno nije dostupna.' : 'GPS lokacija je ponovo dostupna.', 'info')
      await inv()
    },
  })

  const susp = useMutation({
    mutationFn: (v: boolean) => driverSetSuspendedDemo(accountId, v),
    onSuccess: async (_, v) => {
      push(v ? 'Račun je označen kao suspendovan.' : 'Status suspendovanja je uklonjen.', 'info')
      await inv()
    },
  })

  const lic = useMutation({
    mutationFn: (v: boolean) => driverSetLicenseExpiredDemo(accountId, v),
    onSuccess: async (_, v) => {
      push(v ? 'Licenca je označena kao istekla.' : 'Status licence: valjana.', 'info')
      await inv()
    },
  })

  const debt = useMutation({
    mutationFn: (v: boolean) => driverSetDebtDemo(accountId, v),
    onSuccess: async (_, v) => {
      push(v ? 'Evidentiran je dug prema firmi.' : 'Dug prema firmi je uklonjen.', 'info')
      await inv()
    },
  })

  const demoPhaseMut = useMutation({
    mutationFn: (phase: DriverDemoForcePhase) => driverDemoForcePhase(accountId, phase),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      if ('summary' in res) {
        openRideSummary({
          ...res.summary,
          payment: String(res.summary.payment),
        })
        push(strings().notifications.driverRideSummaryToast, 'success')
      }
      await inv()
      await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
    },
  })

  const outlineBtn =
    'border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5 text-brand-navy'
  const dangerOutline = 'border-2 border-brand-danger/30 text-brand-danger hover:bg-brand-danger/10'

  return (
    <div className={demoGlassPanelClass}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setFoldOpen((v) => !v)}
        aria-expanded={foldOpen}
      >
        <span className="flex min-w-0 items-start gap-2">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-brand-yellow-dark" aria-hidden />
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wide text-brand-yellow">Interni test scenariji</span>
            <span className="mt-1 block text-xs text-slate-600">
              Alati za provjeru toka aplikacije (samo za unutrašnju upotrebu). Ne utiču na putnički dio.
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn('mt-0.5 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200', foldOpen && 'rotate-180')}
          aria-hidden
        />
      </button>
      {foldOpen ? (
      <div className={cn('mt-3 space-y-3', demoGlassDividerClass)}>
        <div>
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-brand-navy">{t.common.demoSpeedLabel}:</span>{' '}
            <span className="font-extrabold text-brand-navy">{simSpeed}x</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{t.common.demoSimMapHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([1, 2, 4, 10] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                type="button"
                className={
                  simSpeed === s
                    ? 'border-2 border-brand-yellow/50 bg-brand-yellow/10 text-brand-navy hover:bg-brand-yellow/15'
                    : outlineBtn
                }
                disabled={simSpeed === s}
                onClick={() => setSimSpeed(s)}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
        {activeRide ? (
          <div>
            <p className="text-xs font-semibold text-brand-navy">{t.common.demoControls} — aktivna vožnja</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={outlineBtn}
                disabled={demoPhaseMut.isPending}
                onClick={() => demoPhaseMut.mutate('vozac_na_putu')}
              >
                {t.common.forceDriverWay}
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={outlineBtn}
                disabled={demoPhaseMut.isPending}
                onClick={() => demoPhaseMut.mutate('stigao')}
              >
                {t.common.forceArrived}
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={outlineBtn}
                disabled={demoPhaseMut.isPending}
                onClick={() => demoPhaseMut.mutate('u_toku')}
              >
                {t.common.forceStartRide}
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={outlineBtn}
                disabled={demoPhaseMut.isPending}
                onClick={() => demoPhaseMut.mutate('zavrsena')}
              >
                {t.common.forceComplete}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className={outlineBtn}
          onClick={() => simReq.mutate()}
          disabled={simReq.isPending}
        >
          Novi test zahtjev
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => gps.mutate(true)} disabled={gps.isPending}>
          GPS greška ON
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => gps.mutate(false)} disabled={gps.isPending}>
          GPS greška OFF
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => susp.mutate(true)} disabled={susp.isPending}>
          Suspendovan nalog ON
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => susp.mutate(false)} disabled={susp.isPending}>
          Suspendovan OFF
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => lic.mutate(true)} disabled={lic.isPending}>
          Istekla licenca ON
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => lic.mutate(false)} disabled={lic.isPending}>
          Licenca OK
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => debt.mutate(true)} disabled={debt.isPending}>
          Dug firmi ON
        </Button>
        <Button size="sm" variant="outline" className={outlineBtn} onClick={() => debt.mutate(false)} disabled={debt.isPending}>
          Dug OFF
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={dangerOutline}
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
        >
          Vrati početno stanje
        </Button>
        </div>
      </div>
      ) : null}
    </div>
  )
}
