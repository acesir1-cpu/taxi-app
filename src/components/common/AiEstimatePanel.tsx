import { Clock3, MapPin, Route, Sparkles, Wallet } from 'lucide-react'
import { LoadingState } from './LoadingState'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import type { AiRideEstimate } from '../../services/aiEstimateApi'

export function AiEstimatePanel({
  estimate,
  isLoading,
  errorKey,
  variant = 'default',
  scope = 'dispatcher',
  className,
}: {
  estimate: AiRideEstimate | null | undefined
  isLoading?: boolean
  errorKey?: string | null
  variant?: 'default' | 'compact'
  scope?: 'dispatcher' | 'order'
  className?: string
}) {
  const all = strings()
  const a = scope === 'order' ? all.order.ai : all.dispatcher.ai

  if (isLoading && !estimate) {
    return (
      <div className={cn('rounded-2xl border border-violet-200/80 bg-violet-50/60 p-4', className)}>
        <LoadingState />
      </div>
    )
  }

  if (errorKey === 'same_location' || errorKey === 'outside_zone') {
    return (
      <div className={cn('rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900', className)}>
        {errorKey === 'same_location' ? a.errorSameLocation : a.errorOutsideZone}
      </div>
    )
  }

  if (!estimate) return null

  const insight = a.insights[estimate.insightId] ?? a.insights.normal
  const demand = a.demand[estimate.demandLevel as keyof typeof a.demand]
  const traffic = a.traffic[estimate.trafficLevel]

  return (
    <section
      className={cn(
        'ai-estimate-panel rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-amber-50/40 p-4 shadow-sm',
        variant === 'compact' && 'p-3',
        className,
      )}
      aria-label={a.ariaLabel}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{a.badge}</p>
            <p className="text-sm font-semibold text-brand-navy">{a.title}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-200">
          {a.confidence.replace('{pct}', String(estimate.confidencePercent))}
        </span>
      </header>

      <div className={cn('mt-3 grid gap-2', variant === 'compact' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        <Metric icon={Wallet} label={a.price} value={`${estimate.estimatedPrice.toFixed(2)} BAM`} emphasize />
        <Metric icon={Route} label={a.distance} value={`${estimate.distanceKm.toFixed(1)} km`} />
        <Metric icon={Clock3} label={a.duration} value={`~${estimate.durationMin} min`} />
        <Metric icon={MapPin} label={a.demandLabel} value={demand} />
      </div>

      <p className="mt-3 text-xs font-medium leading-relaxed text-slate-700">
        <span className="font-bold text-violet-800">{traffic}</span>
        <span className="text-slate-400"> · </span>
        {insight}
      </p>
      {estimate.nightTariffApplied ? (
        <p className="mt-1 text-[11px] font-semibold text-indigo-700">{a.nightNote}</p>
      ) : null}
    </section>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  emphasize,
}: {
  icon: typeof Wallet
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/70 px-2.5 py-2">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className={cn('mt-0.5 text-sm font-bold text-brand-navy', emphasize && 'text-base')}>{value}</p>
    </div>
  )
}
