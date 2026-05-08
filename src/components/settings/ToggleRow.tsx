import { cn } from '../../lib/utils'

export function ToggleRow({
  title,
  description,
  enabled,
  onChange,
  recommended,
  recommendedLabel,
}: {
  title: string
  description: string
  enabled: boolean
  onChange: (next: boolean) => void
  recommended?: boolean
  recommendedLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-brand-navy">
            {title}{' '}
            {recommended ? (
              <span className="text-xs font-medium text-emerald-700">({recommendedLabel ?? 'Recommended'})</span>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
            enabled ? 'bg-emerald-500' : 'bg-slate-300'
          )}
        >
          <span
            className={cn(
              'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  )
}
