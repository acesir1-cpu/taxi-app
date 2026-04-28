import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/** Served from `public/` so Vite always resolves it. */
const HERO_IMAGE = '/taxi-sign-night.jpg'

type NightRideBackgroundProps = {
  variant: 'welcome' | 'auth'
  children: ReactNode
  className?: string
}

/**
 * Shared night-city hero: taxi photo plus graded overlays so welcome, auth,
 * and marketing routes feel like one product (navy / teal / amber cab light).
 */
export function NightRideBackground({ variant, children, className }: NightRideBackgroundProps) {
  const welcome = variant === 'welcome'

  return (
    <div className={cn('relative min-h-screen overflow-hidden', className)}>
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand-navy via-[#0b1524] to-[#050d12]"
        aria-hidden
      />
      <div
        className={cn(
          'absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.93]',
          'welcome-bg-drift',
        )}
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-teal-900/25 via-transparent to-amber-900/20 mix-blend-soft-light"
        aria-hidden
      />
      <div
        className={cn(
          'absolute inset-0',
          welcome
            ? 'bg-gradient-to-b from-black/52 via-stone-950/26 to-black/74'
            : 'bg-gradient-to-b from-stone-950/48 via-stone-950/22 to-stone-950/78',
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_96%_70%_at_50%_42%,transparent_32%,rgba(0,0,0,0.34)_100%)]"
        aria-hidden
      />
      {welcome ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.52),inset_0_0_48px_rgba(0,0,0,0.28)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-24 top-[18%] h-80 w-80 rounded-full bg-amber-400/[0.11] blur-[88px] animate-welcome-bokeh"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 bottom-[22%] h-72 w-72 rounded-full bg-teal-400/[0.09] blur-[80px] animate-welcome-bokeh-delayed"
            aria-hidden
          />
        </>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_85%_18%,rgba(255,196,0,0.06),transparent_70%)]"
          aria-hidden
        />
      )}
      {children}
    </div>
  )
}
