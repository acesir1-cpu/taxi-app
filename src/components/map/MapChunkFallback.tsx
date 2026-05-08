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
        'flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-sm font-medium text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:min-h-[420px]',
        className
      )}
    >
      {t.common.loading}
    </div>
  )
}
