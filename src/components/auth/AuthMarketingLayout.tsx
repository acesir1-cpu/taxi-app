import { motion } from 'framer-motion'
import { ArrowLeft, CarTaxiFront, Clock3, Star, Users } from 'lucide-react'
import { useEffect, useReducer, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMe } from '../../hooks/useMe'
import { getGuestLang, setGuestLang } from '../../i18n/guestLocale'
import { strings } from '../../i18n/strings'
import { LoadingState } from '../common/LoadingState'
import { cn } from '../../lib/utils'
import { AuthHeroPanel } from './AuthHeroPanel'

const APP_VERSION = 'v3.1'

/** Mobile hero; desktop pozadina je na `.form-panel` u CSS-u. */
const FORM_HERO_MOBILE = '/brand-hero-mobile.png'

function MobileHeroBrand({ compact }: { compact?: boolean }) {
  const t = strings()
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 text-white',
        compact && 'scale-[0.92] origin-left',
      )}
    >
      <CarTaxiFront className="h-8 w-8 shrink-0 text-white" strokeWidth={2.3} aria-hidden />
      <span className="truncate text-[17px] font-bold tracking-tight">{t.brand}</span>
    </div>
  )
}

/**
 * Split layout for /welcome, /login, /register.
 * Hero stays mounted; only the form column swaps via <Outlet />.
 */
export function AuthMarketingLayout() {
  const { data, isLoading } = useMe()
  const location = useLocation()
  const t = strings()
  const wc = t.welcome
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const lg = getGuestLang()

  const path = location.pathname
  const showFooter = path === '/welcome'
  const showBack = path !== '/welcome'
  const welcomeSocialItems = [
    { icon: Star, label: wc.socialRating },
    { icon: Users, label: wc.socialUsers },
    { icon: Clock3, label: wc.socialWait },
  ]

  useEffect(() => {
    document.body.classList.add('auth-screen')
    return () => {
      document.body.classList.remove('auth-screen')
    }
  }, [])

  function pickLang(next: 'bs' | 'en') {
    setGuestLang(next)
    rerender()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <LoadingState />
      </div>
    )
  }

  if (data?.kind === 'driver') {
    return <Navigate to="/driver" replace />
  }
  if (data?.kind === 'passenger') {
    return <Navigate to="/app/order" replace />
  }

  const langToggle = (tone: 'onHero' | 'onForm') => (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 text-[12px]',
        tone === 'onHero' && 'text-white',
      )}
    >
      <button
        type="button"
        onClick={() => pickLang('bs')}
        className={cn(
          'font-semibold transition-colors',
          tone === 'onHero'
            ? lg === 'bs'
              ? 'text-white'
              : 'text-white/55 hover:text-white/85'
            : lg === 'bs'
              ? 'text-[#111827]'
              : 'text-[#9CA3AF] hover:text-[#6B7280]',
        )}
      >
        {wc.langBs}
      </button>
      <span
        className={cn('select-none', tone === 'onHero' ? 'text-white/40' : 'text-[#D1D5DB]')}
        aria-hidden
      >
        {tone === 'onHero' ? (
          '·'
        ) : (
          <>
            <span className="md:hidden">·</span>
            <span className="hidden md:inline">|</span>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => pickLang('en')}
        className={cn(
          'font-semibold transition-colors',
          tone === 'onHero'
            ? lg === 'en'
              ? 'text-white'
              : 'text-white/55 hover:text-white/85'
            : lg === 'en'
              ? 'text-[#111827]'
              : 'text-[#9CA3AF] hover:text-[#6B7280]',
        )}
      >
        {wc.langEn}
      </button>
    </div>
  )

  const welcomeOnMobile = path === '/welcome'

  const marketingFooter = (extraClass: string): ReactNode =>
    showFooter ? (
      <footer className={cn('flex w-full flex-wrap items-center justify-between gap-2', extraClass)}>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-medium">
          <Link
            to="/privacy"
            className="underline-offset-[3px] transition-colors hover:text-[#111827] hover:underline"
          >
            {wc.privacyShort}
          </Link>
          <span className="select-none" aria-hidden>
            ·
          </span>
          <Link
            to="/terms"
            className="underline-offset-[3px] transition-colors hover:text-[#111827] hover:underline"
          >
            {wc.termsShort}
          </Link>
          <span className="select-none" aria-hidden>
            ·
          </span>
          <Link
            to="/support"
            className="underline-offset-[3px] transition-colors hover:text-[#111827] hover:underline"
          >
            {wc.support}
          </Link>
        </div>
        <span className="text-[11px] font-medium">{APP_VERSION}</span>
      </footer>
    ) : null

  return (
    <div
      className={cn(
        'auth-marketing-root grid min-h-screen min-h-[100svh] min-h-[100dvh] w-full',
        'grid-cols-1 md:grid-cols-[40fr_60fr] lg:grid-cols-[45fr_55fr]',
      )}
    >
      <AuthHeroPanel className="order-2 hidden md:order-1 md:flex" />

      <div
        className={cn(
          'auth-marketing-right relative z-0 order-1 flex min-h-[100dvh] flex-col overflow-hidden md:order-2 md:min-h-0',
        )}
      >
        <div
          className={cn(
            'auth-container mobile-auth-container flex min-h-[100dvh] min-h-[100svh] flex-col md:contents md:min-h-0',
            path === '/welcome' && 'landing-page',
          )}
        >
          {/* Mobile: hero strip + card; desktop: full-bleed image remains behind forma */}
          <div
            className={cn(
              'mobile-hero relative shrink-0 md:hidden',
              welcomeOnMobile && 'mobile-hero--welcome',
            )}
            style={{ backgroundImage: `url('${FORM_HERO_MOBILE}')` }}
          >
            <div className="mobile-hero-top">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {showBack ? (
                  <Link
                    to="/welcome"
                    className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-white drop-shadow-sm transition-opacity hover:opacity-90"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
                    {t.auth.backToWelcome}
                  </Link>
                ) : (
                  <MobileHeroBrand />
                )}
                {showBack ? <MobileHeroBrand compact /> : null}
              </div>
              {langToggle('onHero')}
            </div>

            {welcomeOnMobile ? (
              <div className="mobile-hero-content">
                <span className="powered-by-badge inline-flex items-center rounded-md px-2.5 py-1 text-[10px] uppercase tracking-wide">
                  {wc.aiBadge}
                </span>
                <h1 className="mobile-hero-title">{wc.title}</h1>
                <p className="mobile-hero-subtitle">{wc.subtitle}</p>
                <div className="welcome-social-proof mobile-welcome-social-proof" aria-label={wc.socialProof}>
                  {welcomeSocialItems.map(({ icon: Icon, label }) => (
                    <span key={label} className="welcome-social-proof-item">
                      <Icon className="h-[13px] w-[13px] shrink-0" strokeWidth={2.2} aria-hidden />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1" aria-hidden />
            )}
          </div>

          <div
            className={cn(
              'form-panel relative z-10 flex min-h-0 flex-col md:flex-1',
              showFooter && 'auth-marketing-form-panel--welcome',
            )}
          >
            {showBack ? (
              <Link
                to="/welcome"
                className="auth-marketing-panel-back absolute left-8 top-6 z-20 hidden md:inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
                {t.auth.backToWelcome}
              </Link>
            ) : null}
            <div className="lang-switcher hidden md:block">{langToggle('onForm')}</div>

            <div className="auth-marketing-form-column flex min-h-0 flex-1 flex-col md:flex-none md:items-center md:justify-center">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'form-container mobile-form-card auth-marketing-form-surface mx-auto w-full max-w-[420px] min-h-0 text-left md:mx-auto',
                  path === '/welcome' && 'landing-form-card max-md:max-w-none',
                  path === '/register' && 'mobile-form-card--register',
                )}
              >
                {path === '/welcome' ? (
                  <div className="landing-content flex w-full flex-col items-center">
                    <Outlet />
                    {showFooter
                      ? marketingFooter(
                          'auth-footer auth-marketing-footer auth-marketing-footer--in-card mt-6 md:hidden',
                        )
                      : null}
                  </div>
                ) : (
                  <>
                    <Outlet />
                    {showFooter
                      ? marketingFooter(
                          'auth-footer auth-marketing-footer auth-marketing-footer--in-card mt-6 md:hidden',
                        )
                      : null}
                  </>
                )}
              </motion.div>
            </div>

            {showFooter
              ? marketingFooter(
                  'auth-marketing-footer auth-marketing-footer--desktop-dock mt-auto hidden w-full justify-center px-6 sm:px-8 md:mt-0 md:flex md:px-6',
                )
              : null}
          </div>
        </div>
      </div>
    </div>
  )
}
