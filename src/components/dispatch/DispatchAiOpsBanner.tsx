import { Sparkles } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

export function DispatchAiOpsBanner({ className }: { className?: string }) {
  const t = strings()
  const a = t.dispatcher.ai
  const d = t.dispatcher.dashboard

  return (
    <div
      className={cn(
        'flex gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50/90 via-white to-amber-50/50 px-4 py-3 shadow-sm',
        className,
      )}
      role="note"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
        <Sparkles className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{a.opsBannerTitle}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-slate-700">{d.aiOpsHint}</p>
      </div>
    </div>
  )
}
