import { Car } from 'lucide-react'
import { AiEstimatePanel } from '../common/AiEstimatePanel'
import { useAiRouteEstimate } from '../../hooks/useAiRouteEstimate'
import { strings } from '../../i18n/strings'
import type { Location, OrderType, RouteEstimate } from '../../types/domain'

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className={emphasize ? 'text-lg font-bold text-brand-navy' : 'font-semibold text-brand-navy'}>{value}</span>
    </div>
  )
}

export function OrderEstimateAiSection({
  pickup,
  destination,
  orderType,
  scheduledAt,
  nearbyDrivers,
  routeFallback,
  routeLoading,
}: {
  pickup: Location | null
  destination: Location | null
  orderType: OrderType
  scheduledAt?: string
  nearbyDrivers: number
  routeFallback: RouteEstimate | null
  routeLoading: boolean
}) {
  const t = strings()
  const o = t.order
  const aiQ = useAiRouteEstimate(pickup ?? undefined, destination ?? undefined, {
    availableDrivers: nearbyDrivers,
    orderType,
    scheduledAt,
  })
  const aiEstimate = aiQ.data && !('error' in aiQ.data) ? aiQ.data : null
  const aiError = aiQ.data && 'error' in aiQ.data ? aiQ.data.error : null
  const loading = (aiQ.isFetching || routeLoading) && !aiEstimate && !routeFallback

  if (!pickup || !destination) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-slate-700">
          <Car className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-brand-navy">{o.waitingRouteSelection}</p>
          <p className="text-xs font-medium text-slate-500">{o.notAvailable}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-4">
        <span className="inline-flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-violet-200/80" />
        <p className="text-sm font-medium text-slate-600">{t.common.loading}</p>
      </div>
    )
  }

  if (aiError === 'same_location' || aiError === 'outside_zone') {
    return <AiEstimatePanel scope="order" estimate={null} errorKey={aiError} variant="compact" />
  }

  if (aiEstimate) {
    return <AiEstimatePanel scope="order" estimate={aiEstimate} variant="compact" className="border-0 shadow-none" />
  }

  if (routeFallback) {
    return (
      <>
        <Row label={o.estimate} value={`${routeFallback.estimatedPrice.toFixed(2)} ${o.bam}`} emphasize />
        <Row label={o.distance} value={`${routeFallback.distanceKm.toFixed(2)} ${o.km}`} />
        <Row label={o.eta} value={`~${routeFallback.durationMin} ${o.min}`} />
      </>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-slate-700">
        <Car className="h-5 w-5" aria-hidden />
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-brand-navy">{o.waitingRouteSelection}</p>
        <p className="text-xs font-medium text-slate-500">{o.notAvailable}</p>
      </div>
    </div>
  )
}
