import { Sparkles } from 'lucide-react'
import { LoadingState } from '../common/LoadingState'
import { DriverStatusPill } from './dispatchUi'
import { Button } from '../ui/button'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import { haversineKm } from '../../utils/distance'
import { scoreDriverAiMatch } from '../../services/aiEstimateApi'
import type { AiRideEstimate } from '../../services/aiEstimateApi'
import type { DispatchDriverRow } from '../../services/dispatcherApi'
import type { Location } from '../../types/domain'

export function DispatchDriverSuggestList({
  drivers,
  pickup,
  availableDrivers,
  aiEstimate,
  isLoading,
  assignPending,
  onAssign,
  assignLabel,
  emptyMessage,
}: {
  drivers: DispatchDriverRow[] | undefined
  pickup: Location
  availableDrivers: number
  aiEstimate?: AiRideEstimate | null
  isLoading?: boolean
  assignPending?: boolean
  onAssign: (driverId: string) => void
  assignLabel: string
  emptyMessage: string
}) {
  const r = strings().dispatcher.rides
  const ai = strings().dispatcher.ai

  if (isLoading) return <LoadingState />

  if (!drivers?.length) {
    return <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">{emptyMessage}</p>
  }

  const suggested = drivers[0]
  const others = drivers.slice(1)

  function renderDriverCard(row: DispatchDriverRow, index: number, isSuggested: boolean) {
    const km = haversineKm(row.driver.currentLocation, pickup)
    const matchScore = scoreDriverAiMatch(km, availableDrivers)
    const etaMin = Math.max(2, Math.round(km * 2.2 * (aiEstimate?.trafficLevel === 'heavy' ? 1.12 : 1)))

    return (
      <div
        key={row.driver.id}
        className={cn(
          'rounded-2xl border bg-white p-3 shadow-sm',
          isSuggested ? 'border-violet-300 ring-1 ring-violet-200' : 'border-slate-100',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-navy">
              {row.driver.firstName} {row.driver.lastName}
              {isSuggested ? (
                <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  {ai.listAiTag}
                </span>
              ) : (
                <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">#{index + 1}</span>
              )}
            </p>
            <p className="truncate text-xs text-slate-500">
              {row.vehicle?.brand} {row.vehicle?.model} · {row.vehicle?.registration}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {r.distanceToPickup.replace('{km}', km.toFixed(1))} · {row.zoneLabel}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-violet-700">
              {ai.driverMatch.replace('{score}', String(matchScore))} · {ai.driverEta.replace('{min}', String(etaMin))}
            </p>
          </div>
          <DriverStatusPill status={row.driver.availabilityStatus} />
        </div>
        <Button
          className="mt-3 w-full"
          size="sm"
          variant={isSuggested ? 'cta' : 'secondary'}
          disabled={assignPending}
          onClick={() => onAssign(row.driver.id)}
        >
          {isSuggested ? r.confirmAssignSuggested : assignLabel}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-700">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {r.aiSuggestedTitle}
        </p>
        {renderDriverCard(suggested, 0, true)}
      </div>

      {others.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{r.otherDriversTitle}</p>
          <div className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-0.5">
            {others.map((row, index) => renderDriverCard(row, index + 1, false))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
