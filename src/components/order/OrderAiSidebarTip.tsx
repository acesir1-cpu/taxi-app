import { Sparkles } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import type { AiRideEstimate } from '../../services/aiEstimateApi'

export function OrderAiSidebarTip({
  estimate,
  fallback,
  className,
}: {
  estimate: AiRideEstimate | null
  fallback: string
  className?: string
}) {
  const a = strings().order.ai

  if (!estimate) {
    return <p className={cn('text-xs font-medium leading-snug text-amber-600', className)}>{fallback}</p>
  }

  const insight = a.insights[estimate.insightId] ?? a.insights.normal
  const traffic = a.traffic[estimate.trafficLevel]

  return (
    <div
      className={cn('rounded-xl border border-violet-200/70 bg-violet-50/90 px-3 py-2.5', className)}
      role="note"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-800">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {a.sidebarTitle}
      </p>
      <p className="mt-1 text-xs font-medium leading-snug text-slate-700">
        <span className="font-bold text-violet-800">{traffic}</span>
        <span className="text-slate-400"> · </span>
        {insight}
      </p>
    </div>
  )
}
