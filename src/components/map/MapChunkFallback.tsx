import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

/** Placeholder dok se lazy-chunk karte (Leaflet) učitava */
export function MapChunkFallback({ className }: { className?: string }) {
  const t = strings()
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        'flex min-h-[240px] items-center justify-center rounded-2xl border border-black/[0.12] bg-slate-100 text-sm font-medium text-slate-500 shadow-card md:min-h-[420px]',
        className
      )}
    >
      {t.common.loading}
    </div>
  )
}
