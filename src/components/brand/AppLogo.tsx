import { CarTaxiFront } from 'lucide-react'
import { cn } from '../../lib/utils'

export type AppLogoVariant = 'dark' | 'light'

type AppLogoProps = {
  /** Zadržano radi kompatibilnosti; mark je isti kao na login/auth (bez sjene). */
  variant?: AppLogoVariant
  /** Full brand line next to the mark (e.g. TopBar on sm+) */
  brandName?: string
  className?: string
}

/** Taxi ikona + UF — isti izgled kao na login/auth: ravna žuta, bez sjene. */
export function AppLogo({ variant = 'light', brandName, className }: AppLogoProps) {
  void variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex shrink-0 items-center gap-2">
        <CarTaxiFront className="h-8 w-8 shrink-0 text-brand-yellow" strokeWidth={2.3} aria-hidden />
        <span className="text-[1.75rem] font-black tracking-tight text-brand-yellow sm:text-[1.9rem]">UF</span>
      </div>
      {brandName ? (
        <span className="hidden items-center sm:inline-flex">
          <span className="font-extrabold tracking-tight text-brand-navy sm:max-w-[190px] sm:truncate sm:text-base">
            {brandName}
          </span>
        </span>
      ) : null}
    </div>
  )
}
