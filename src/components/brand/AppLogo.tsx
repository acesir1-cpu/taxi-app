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
export function AppLogo({ variant: _variant = 'light', brandName, className }: AppLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex shrink-0 items-center gap-2.5 py-0.5">
        <CarTaxiFront className="h-9 w-9 shrink-0 text-brand-yellow" strokeWidth={2.35} aria-hidden />
        <span className="text-3xl font-black tracking-tight text-brand-yellow sm:text-[2.125rem]">UF</span>
      </div>
      {brandName ? (
        <span className="hidden font-bold tracking-tight text-brand-navy sm:inline sm:max-w-[200px] sm:truncate sm:text-lg">
          {brandName}
        </span>
      ) : null}
    </div>
  )
}
