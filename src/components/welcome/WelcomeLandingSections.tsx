import { ArrowRight, Clapperboard, QrCode, Snowflake, Sunrise } from 'lucide-react'
import { Link } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

const sectionPad = 'py-20 md:py-28'

const glassCard =
  'flex h-full flex-col rounded-2xl border border-amber-900/10 bg-white/70 p-6 shadow-sm shadow-amber-900/[0.06] backdrop-blur-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-amber-500/25 hover:shadow-lg'

const sectionShell = 'w-full bg-gradient-to-b from-[#f8f9fb] via-[#f3f4f6] to-[#eef0f3]'

const sectionInner = 'mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12'

const pulseIcons = [Sunrise, Snowflake, Clapperboard] as const

const webCtaButton =
  'raja-web-cta inline-flex w-full items-center justify-center gap-2 rounded-[28px] bg-[#F5A623] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-900/20 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:bg-[#FFB840] hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 md:min-w-[300px] lg:min-w-[320px]'

export function WelcomeLandingSections({ className }: { className?: string }) {
  const ls = strings().welcome.landingSections

  return (
    <div className={cn('welcome-landing-sections', sectionShell, className)}>
      <section className={sectionPad} aria-labelledby="raja-pulse-heading">
        <div className={sectionInner}>
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#92600a]">
              {ls.pulse.eyebrow}
            </p>
            <h2
              id="raja-pulse-heading"
              className="mt-3 text-[1.65rem] font-extrabold leading-tight tracking-tight text-[#111827] sm:text-3xl lg:text-4xl"
            >
              {ls.pulse.title}
            </h2>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#4b5563] sm:text-base">
              {ls.pulse.subtitle}
            </p>
          </header>

          <div className="mt-10 grid grid-cols-1 items-stretch gap-6 md:mt-14 md:grid-cols-3 md:gap-8">
            {ls.pulse.cards.map((card, index) => {
              const Icon = pulseIcons[index] ?? Sunrise
              return (
                <article key={card.title} className={glassCard}>
                  <div
                    className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-[#b8700a]"
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-amber-600/20 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92600a]">
                    {card.badge}
                  </span>
                  <h3 className="mt-3 text-lg font-extrabold tracking-tight text-[#111827]">
                    {card.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13px] font-medium leading-relaxed text-[#64748b] sm:text-sm">
                    {card.body}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section
        className={cn(
          'border-y border-slate-900/5 bg-white/40 backdrop-blur-sm',
          sectionPad,
        )}
        aria-labelledby="raja-trust-heading"
      >
        <div className={sectionInner}>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
            <header className="lg:sticky lg:top-28 lg:max-w-md lg:flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#92600a]">
                {ls.trust.eyebrow}
              </p>
              <h2
                id="raja-trust-heading"
                className="mt-3 text-[1.65rem] font-extrabold leading-tight tracking-tight text-[#111827] sm:text-3xl"
              >
                {ls.trust.title}
              </h2>
              <p className="mt-5 text-[15px] font-medium leading-relaxed text-[#374151] sm:text-base">
                {ls.trust.narrative}
              </p>
            </header>

            <div className="flex flex-col gap-6 md:flex-row md:flex-1 md:items-stretch md:gap-5 lg:max-w-2xl">
              <article
                className={cn(
                  glassCard,
                  'relative flex-1 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-[#F5A623] before:to-amber-200',
                )}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#92600a]">
                  {ls.trust.passengerLabel}
                </p>
                <p className="mt-2 text-sm font-extrabold text-[#111827]">
                  {ls.trust.testimonials[0].role}
                </p>
                <blockquote className="mt-4 flex-1 border-l-2 border-amber-400/60 pl-3 text-[13px] font-medium italic leading-relaxed text-[#4b5563] sm:text-sm">
                  “{ls.trust.testimonials[0].quote}”
                </blockquote>
              </article>

              <article
                className={cn(
                  glassCard,
                  'relative flex-1 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-slate-700 before:to-slate-400',
                )}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#92600a]">
                  {ls.trust.driverLabel}
                </p>
                <p className="mt-2 text-sm font-extrabold text-[#111827]">
                  {ls.trust.testimonials[1].role}
                </p>
                <blockquote className="mt-4 flex-1 border-l-2 border-slate-400/60 pl-3 text-[13px] font-medium italic leading-relaxed text-[#4b5563] sm:text-sm">
                  “{ls.trust.testimonials[1].quote}”
                </blockquote>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionPad} aria-labelledby="raja-cta-heading">
        <div className={sectionInner}>
          <article className="raja-cta-dashboard mx-auto max-w-3xl rounded-2xl border border-amber-900/10 bg-gradient-to-br from-white/95 via-white/80 to-amber-50/50 p-8 text-center shadow-xl backdrop-blur-xl sm:p-10 lg:p-12">
            <h2
              id="raja-cta-heading"
              className="text-[1.5rem] font-extrabold leading-tight tracking-tight text-[#111827] sm:text-3xl"
            >
              {ls.cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] font-medium leading-relaxed text-[#4b5563] sm:text-base">
              {ls.cta.subtitle}
            </p>

            <div
              className="mt-8 rounded-2xl border border-dashed border-amber-500/35 bg-amber-500/[0.06] px-4 py-6 text-[13px] font-semibold text-[#6b7280] sm:text-sm"
              role="status"
              aria-live="polite"
            >
              {ls.cta.interactivePlaceholder}
            </div>

            <footer className="mt-10">
              <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
                <Link to="/login" className={webCtaButton}>
                  {ls.cta.startWeb}
                  <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
                </Link>

                <div className="hidden flex-col items-center gap-2 md:flex md:shrink-0">
                  <div
                    className="flex h-[108px] w-[108px] flex-col items-center justify-center gap-1 rounded-xl border border-amber-900/15 bg-white/90 text-center shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
                    aria-label={ls.cta.qrLabel}
                  >
                    <QrCode className="h-8 w-8 text-[#9ca3af]" strokeWidth={1.8} aria-hidden />
                    <span className="px-2 text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">
                      {ls.cta.qrPlaceholder}
                    </span>
                  </div>
                  <p className="max-w-[200px] text-center text-[11px] font-semibold leading-snug text-[#6b7280]">
                    {ls.cta.qrScanHint}
                  </p>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </section>
    </div>
  )
}
