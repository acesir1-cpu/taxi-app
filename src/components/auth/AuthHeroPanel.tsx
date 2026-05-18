import {
  CarTaxiFront,
  CreditCard,
  Headphones,
  MapPinned,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import { AuthHeroDepth } from './AuthHeroDepth'
import { AuthHeroMapDecor } from './AuthHeroMapDecor'

/**
 * Shared left (desktop) / lower (mobile) brand hero for Welcome, Login, Register.
 * Gradient depth, radial sheen, corner rings — bez mape u pozadini.
 */
export function AuthHeroPanel({ className }: { className?: string }) {
  const t = strings()
  const wc = t.welcome
  const features = [
    { icon: ShieldCheck, title: wc.featureVerifiedTitle, body: wc.featureVerifiedBody },
    { icon: MapPinned, title: wc.featureTrackingTitle, body: wc.featureTrackingBody },
    { icon: CreditCard, title: wc.featurePaymentTitle, body: wc.featurePaymentBody },
    { icon: Headphones, title: wc.featureCoverageTitle, body: wc.featureCoverageBody },
  ]

  return (
    <aside
      className={cn(
        'hero-panel auth-hero-panel relative z-10 flex min-h-[300px] flex-col justify-between overflow-hidden border-none px-6 py-8 md:h-full md:min-h-0 md:px-10 md:py-12 lg:px-12',
        className,
      )}
    >
      <AuthHeroDepth />
      <AuthHeroMapDecor />
      <div className="auth-hero-edge-glow" aria-hidden />

      <div className="auth-hero-rings" aria-hidden>
        <div className="auth-hero-ring-outer" />
        <div className="auth-hero-ring-inner" />
      </div>

      <div className="auth-hero-text-depth relative z-[10] flex flex-1 flex-col">
        {/* Brand row */}
        <div className="flex items-center gap-2.5">
          <CarTaxiFront className="h-8 w-8 shrink-0 text-white" strokeWidth={2.3} aria-hidden />
          <span className="text-[17px] font-bold tracking-tight text-white md:text-[18px]">
            {t.brand}
          </span>
        </div>

        {/* Hero copy */}
        <div className="mt-10 max-w-xl md:mt-12 lg:mt-14">
          <h1 className="space-y-1 text-[2rem] font-black leading-snug tracking-tight text-white sm:text-[2.5rem] sm:leading-snug lg:text-5xl lg:leading-snug xl:text-[3rem] xl:leading-snug">
            <span className="block">{wc.aiTitlePart1}</span>
            <span className="block">{wc.aiTitlePart2}</span>
            <span className="block">{wc.aiTitlePart3}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] font-medium leading-relaxed text-white/85 md:mt-6 md:text-base">
            <span>{wc.aiHighlight1}</span>
            <span className="mx-2 text-white/70" aria-hidden>
              ·
            </span>
            <span>{wc.aiHighlight2}</span>
          </p>
        </div>

        {/* Features */}
        <ul className="auth-hero-feature-grid mt-9 grid grid-cols-1 gap-3.5 md:mt-11 xl:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <HeroFeature key={title} Icon={Icon} title={title} body={body} />
          ))}
        </ul>

      </div>
    </aside>
  )
}

function HeroFeature({ Icon, title, body }: { Icon: LucideIcon; title: string; body: string }) {
  return (
    <li
      className={cn(
        'auth-hero-feature-card flex items-start gap-3',
        'rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:bg-white/15 hover:shadow-lg hover:shadow-black/10',
      )}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-md"
        aria-hidden
      >
        <Icon className="h-[17px] w-[17px] text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug text-white">{title}</p>
        <p className="auth-hero-feature-body mt-1 text-[11px] font-semibold leading-snug text-white/75">
          {body}
        </p>
      </div>
    </li>
  )
}
