import { Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'

/** Matches cancel CTA on Zakazane vožnje — soft red border, no dark outline. */
export function ScheduledRideCancelButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-0 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-[#FECACA] bg-transparent font-semibold text-[#EF4444] transition hover:bg-red-50/70 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  )
}
