import { ArrowDownUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function PickupDestinationFields({
  pickup,
  destination,
  onSwap,
  swapLabel,
  className,
  variant = 'default',
}: {
  pickup: ReactNode
  destination: ReactNode
  onSwap: () => void
  swapLabel: string
  className?: string
  /** `sheet`: gradient connector + square drop marker; swap on right (mobile bottom sheet). */
  variant?: 'default' | 'sheet'
}) {
  if (variant === 'sheet') {
    return (
      <div className={cn('relative flex gap-2', className)}>
        <div className="relative w-7 shrink-0 self-stretch">
          <div
            className="pointer-events-none absolute left-1/2 top-[2.625rem] bottom-[2.625rem] w-0.5 -translate-x-1/2 bg-gradient-to-b from-brand-teal via-slate-300 to-slate-300"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[2.625rem] z-[1] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-teal bg-white"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-[2.625rem] left-1/2 z-[1] h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-sm border-2 border-brand-navy bg-white"
            aria-hidden
          />
          <button
            type="button"
            onClick={onSwap}
            title={swapLabel}
            aria-label={swapLabel}
            className="absolute right-0 top-1/2 z-[4] h-8 w-8 -translate-y-1/2 translate-x-1/2 rounded-full border-[1.5px] border-[#E5E7EB] bg-white text-slate-600 shadow-sm transition active:scale-95"
          >
            <ArrowDownUp className="mx-auto h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="relative z-[2] min-w-0 flex-1 space-y-4">
          {pickup}
          {destination}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2.5 sm:gap-3', className)}>
      <div className="relative w-10 shrink-0 self-stretch sm:w-11">
        <div
          className="pointer-events-none absolute left-1/2 top-[2.625rem] bottom-[2.625rem] w-px -translate-x-1/2 bg-slate-200"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-[2.625rem] z-[1] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-teal bg-white"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[2.625rem] left-1/2 z-[1] h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-brand-navy bg-white"
          aria-hidden
        />
        <button
          type="button"
          onClick={onSwap}
          title={swapLabel}
          aria-label={swapLabel}
          className="absolute left-1/2 top-1/2 z-[2] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-teal/50 hover:text-brand-navy active:scale-95"
        >
          <ArrowDownUp className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        {pickup}
        {destination}
      </div>
    </div>
  )
}
