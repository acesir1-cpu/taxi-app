import {
  ArrowRight,
  Clock3,
  CreditCard,
  Loader2,
  MapPinned,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Headphones,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { GoogleGIcon } from '../components/icons/GoogleGIcon'
import { cn } from '../lib/utils'

const btnMotion =
  'transition-[transform,box-shadow,filter,background-color,border-color] duration-150 ease-out hover:-translate-y-px active:scale-[0.98] disabled:translate-y-0 disabled:opacity-60'

export function WelcomePage() {
  useLangRefresh()
  const navigate = useNavigate()
  const location = useLocation()
  const [pending, setPending] = useState<string | null>(null)

  const t = strings()
  const wc = t.welcome

  useEffect(() => {
    setPending(null)
  }, [location.pathname])

  function go(to: string) {
    setPending(to)
    navigate(to)
  }

  const busy = pending !== null
  const socialItems = [
    { icon: Star, label: wc.socialRating },
    { icon: Users, label: wc.socialUsers },
    { icon: Clock3, label: wc.socialWait },
  ]
  const featureItems = [
    { icon: ShieldCheck, title: wc.featureVerifiedTitle, body: wc.featureVerifiedBody },
    { icon: MapPinned, title: wc.featureTrackingTitle, body: wc.featureTrackingBody },
    { icon: CreditCard, title: wc.featurePaymentTitle, body: wc.featurePaymentBody },
    { icon: Headphones, title: wc.featureCoverageTitle, body: wc.featureCoverageBody },
  ]

  return (
    <>
      <div className="welcome-copy hidden md:block">
        <span className="powered-badge">{wc.aiBadge}</span>

        <h1 className="mt-0 font-bold tracking-tight text-[#111827]">{wc.title}</h1>
        <p className="mt-0 text-[14px] leading-relaxed text-[#6B7280]">{wc.subtitle}</p>
        <div className="welcome-social-proof" aria-label={wc.socialProof}>
          {socialItems.map(({ icon: Icon, label }) => (
            <span key={label} className="welcome-social-proof-item">
              <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={2.2} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="welcome-actions mt-6 flex flex-col gap-[10px] md:mt-8">
        <button
          type="button"
          disabled={busy}
          onClick={() => go('/login')}
          className={cn(
            'btn-primary btn-primary-mobile inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#F5A623] text-white shadow-sm shadow-amber-900/[0.12] hover:bg-[#FFB840] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 disabled:cursor-not-allowed md:rounded-[28px]',
            btnMotion,
          )}
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {pending === '/login' ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
          ) : null}
          <span>{pending === '/login' ? t.common.loading : wc.login}</span>
          {pending === '/login' ? null : (
            <ArrowRight className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={2.5} aria-hidden />
          )}
        </button>

        <div className="secondary-buttons flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => go('/register')}
            className={cn(
              'btn-secondary welcome-register-button inline-flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white text-[14px] font-semibold text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 disabled:cursor-not-allowed max-md:h-[52px] md:rounded-[28px]',
              btnMotion,
            )}
            style={{ borderWidth: 1.5 }}
          >
            {pending === '/register' ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="h-[16px] w-[16px] shrink-0" strokeWidth={2.2} aria-hidden />
            )}
            <span className="truncate">
              {pending === '/register' ? t.common.loading : wc.register}
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => go('/login?google=1')}
            className={cn(
              'btn-secondary inline-flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white text-[14px] font-medium text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 disabled:cursor-not-allowed max-md:h-[52px] md:rounded-[28px]',
              btnMotion,
            )}
            style={{ borderWidth: 1.5 }}
            aria-label={wc.google}
          >
            {pending === '/login?google=1' ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <GoogleGIcon className="h-[18px] w-[18px]" />
            )}
            <span className="truncate">Google</span>
          </button>
        </div>
      </div>

      <div className="welcome-feature-grid">
        {featureItems.map(({ icon: Icon, title, body }) => (
          <div key={title} className="welcome-feature-item">
            <span className="welcome-feature-icon" aria-hidden>
              <Icon className="h-[16px] w-[16px]" strokeWidth={2.2} />
            </span>
            <span className="welcome-feature-copy">
              <span className="welcome-feature-title">{title}</span>
              <span className="welcome-feature-body">{body}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
