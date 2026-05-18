import { Clock3, Star, Users } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

/** Shared headline + social proof for welcome form column (desktop + mobile). */
export function WelcomeFormCopy({
  variant = 'desktop',
  className,
}: {
  variant?: 'desktop' | 'mobile' | 'stacked'
  className?: string
}) {
  const wc = strings().welcome
  const socialItems = [
    { icon: Star, label: wc.socialRating },
    { icon: Users, label: wc.socialUsers },
    { icon: Clock3, label: wc.socialWait },
  ]

  if (variant === 'stacked') {
    return (
      <div className={cn('welcome-copy-stacked w-full text-left', className)}>
        <span className="powered-badge">{wc.formEyebrow}</span>
        <h1 className="mt-2 text-[1.35rem] font-extrabold leading-tight tracking-tight text-[#111827] sm:text-2xl">
          {wc.titleMobile}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">{wc.subtitle}</p>
        <div className="welcome-social-proof mt-4" aria-label={wc.socialProof}>
          {socialItems.map(({ icon: Icon, label }) => (
            <span key={label} className="welcome-social-proof-item">
              <Icon className="h-[13px] w-[13px] shrink-0" strokeWidth={2.2} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'mobile') {
    return (
      <div className={cn('mobile-hero-content', className)}>
        <span className="powered-by-badge inline-flex items-center rounded-md px-2.5 py-1 text-[10px] uppercase tracking-wide">
          {wc.formEyebrow}
        </span>
        <h1 className="mobile-hero-title">{wc.titleMobile}</h1>
        <p className="mobile-hero-subtitle">{wc.subtitle}</p>
        <div
          className="welcome-social-proof mobile-welcome-social-proof"
          aria-label={wc.socialProof}
        >
          {socialItems.map(({ icon: Icon, label }) => (
            <span key={label} className="welcome-social-proof-item">
              <Icon className="h-[13px] w-[13px] shrink-0" strokeWidth={2.2} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('welcome-copy hidden md:block', className)}>
      <span className="powered-badge">{wc.formEyebrow}</span>
      <h1 className="mt-0 font-bold tracking-tight text-[#111827]">
        <span className="block">{wc.title}</span>
        <span className="block">{wc.titlePart2}</span>
      </h1>
      <p className="mt-0 text-[14px] leading-relaxed text-[#6B7280] md:text-base">{wc.subtitle}</p>
      <div className="welcome-social-proof" aria-label={wc.socialProof}>
        {socialItems.map(({ icon: Icon, label }) => (
          <span key={label} className="welcome-social-proof-item">
            <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={2.2} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
