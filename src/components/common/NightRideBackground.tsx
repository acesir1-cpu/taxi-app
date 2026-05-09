import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/** Served from `public/` — wide landscape for lg+, portrait art for smaller viewports. */
const HERO_DESKTOP = '/brand-hero-desktop.png'
const HERO_MOBILE = '/brand-hero-mobile.png'

type NightRideBackgroundProps = {
  variant: 'welcome' | 'auth'
  children: ReactNode
  className?: string
}

/**
 * Brand Sarajevo/map illustration: responsive art + graded overlays.
 * Welcome keeps the artwork vivid; auth adds a stronger frost so forms stay readable.
 */
export function NightRideBackground({ variant, children, className }: NightRideBackgroundProps) {
  const welcome = variant === 'welcome'

  return (
    <div className={cn('relative min-h-screen min-h-[100svh] min-h-[100dvh] overflow-hidden bg-[#f3f4f6]', className)}>
      {/* Desktop hero */}
      <div
        className={cn(
          'absolute inset-0 hidden bg-cover bg-center bg-no-repeat lg:block',
          welcome ? 'opacity-100 welcome-bg-drift' : 'opacity-[0.97]',
        )}
        style={{ backgroundImage: `url('${HERO_DESKTOP}')` }}
        aria-hidden
      />
      {/* Mobile / tablet hero — top-weighted so skyline + pin read well in portrait */}
      <div
        className={cn(
          'absolute inset-0 bg-cover bg-[center_top] bg-no-repeat lg:hidden',
          welcome ? 'opacity-100 welcome-bg-drift' : 'opacity-[0.97]',
        )}
        style={{ backgroundImage: `url('${HERO_MOBILE}')` }}
        aria-hidden
      />

      {welcome ? (
        <>
          {/* Welcome: light veil — illustration stays the hero */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-white/10 to-white/30"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_65%_at_50%_38%,transparent_40%,rgb(255_255_255/0.5)_100%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_100%,rgb(243_244_246/0.35),transparent_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-16 top-[12%] h-64 w-64 rounded-full bg-brand-yellow/[0.09] blur-[72px] animate-welcome-bokeh"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-12 bottom-[18%] h-56 w-56 rounded-full bg-brand-yellow/[0.07] blur-[64px] animate-welcome-bokeh-delayed"
            aria-hidden
          />
        </>
      ) : (
        <>
          {/* Auth: stronger frost + cool tint so light cards contrast cleanly */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 via-white/62 to-white/84"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_70%_at_50%_42%,rgb(255_255_255/0.5)_0%,rgb(246_247_249/0.72)_62%,rgb(241_245_249/0.88)_100%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-[1.5px]"
            aria-hidden
          />
        </>
      )}

      {children}
    </div>
  )
}
