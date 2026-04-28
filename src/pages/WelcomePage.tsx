import { motion } from 'framer-motion'
import { Loader2, MapPin } from 'lucide-react'
import { useEffect, useReducer, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getGuestLang, setGuestLang } from '../i18n/guestLocale'
import { strings } from '../i18n/strings'
import { GoogleGIcon } from '../components/icons/GoogleGIcon'
import { Button } from '../components/ui/button'
import { AppLogo } from '../components/brand/AppLogo'
import { PageContainer } from '../components/layout/PageContainer'
import { NightRideBackground } from '../components/common/NightRideBackground'
import { cn } from '../lib/utils'

const btnMotion =
  'transition-[transform,box-shadow,filter,background-color,border-color] duration-150 ease-out hover:-translate-y-px hover:brightness-[1.03] hover:shadow-md active:scale-[0.98] active:brightness-[0.97] disabled:translate-y-0 disabled:opacity-60 disabled:hover:shadow-none disabled:hover:brightness-100'

const modalSurface =
  'rounded-[1.75rem] border border-white/[0.14] px-8 py-9 text-center shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] backdrop-blur-[16px] sm:px-10 sm:py-11'

export function WelcomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [pending, setPending] = useState<string | null>(null)

  const t = strings()
  const wc = t.welcome
  const lg = getGuestLang()

  useEffect(() => {
    setPending(null)
  }, [location.pathname])

  function pickLang(next: 'bs' | 'en') {
    setGuestLang(next)
    rerender()
  }

  function go(to: string) {
    setPending(to)
    navigate(to)
  }

  const busy = pending !== null

  return (
    <NightRideBackground variant="welcome">
      {busy ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] bg-black/20 transition-opacity duration-300"
          aria-hidden
        />
      ) : null}

      <PageContainer className="relative z-10 flex min-h-screen flex-col items-center justify-center py-10 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cn('w-full max-w-md space-y-6', modalSurface)}
          style={{
            background:
              'linear-gradient(180deg, rgba(25,25,22,0.58) 0%, rgba(28,26,24,0.6) 38%, rgba(52,42,32,0.52) 100%)',
            WebkitBackdropFilter: 'blur(16px)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.06 }}
            className="mx-auto flex justify-center py-1"
          >
            <AppLogo variant="dark" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-50 sm:text-3xl sm:font-bold">{t.brand}</h1>
            <p className="text-base font-medium leading-snug text-stone-100 sm:text-lg">{wc.title}</p>
            <p className="text-sm leading-relaxed text-stone-200/90">{wc.subtitle}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden />
            <span className="font-medium text-stone-400">{wc.locationTag}</span>
            <span className="text-stone-600" aria-hidden>
              ·
            </span>
            <div className="flex items-center gap-1 rounded-full bg-black/15 px-1 py-0.5">
              <button
                type="button"
                onClick={() => pickLang('bs')}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                  lg === 'bs' ? 'bg-white/15 text-stone-100' : 'text-stone-500 hover:text-stone-300'
                )}
              >
                {wc.langBs}
              </button>
              <button
                type="button"
                onClick={() => pickLang('en')}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                  lg === 'en' ? 'bg-white/15 text-stone-100' : 'text-stone-500 hover:text-stone-300'
                )}
              >
                {wc.langEn}
              </button>
            </div>
          </div>

          <p className="text-center text-xs font-semibold leading-relaxed tracking-wide text-stone-400/95 sm:text-[13px]">
            {wc.trustSignal}
          </p>

          <div className="flex flex-col gap-2.5 rounded-2xl bg-black/18 px-1 py-2 pt-2.5 ring-1 ring-white/[0.06]">
            <Button
              type="button"
              size="lg"
              className={cn('inline-flex h-12 min-h-12 w-full shrink-0 items-center justify-center gap-2', btnMotion)}
              disabled={busy}
              onClick={() => go('/login')}
            >
              {pending === '/login' ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              <span className="text-center font-semibold">
                {pending === '/login' ? t.common.loading : wc.login}
              </span>
            </Button>
            <p className="-mt-0.5 text-center text-[11px] leading-snug text-stone-400">{wc.loginHelper}</p>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className={cn(
                'inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 border-2 border-white/22 bg-white/[0.1] text-stone-50 shadow-sm shadow-black/10 hover:border-white/35 hover:bg-white/[0.16] hover:text-white hover:shadow-md',
                btnMotion
              )}
              disabled={busy}
              onClick={() => go('/register')}
            >
              {pending === '/register' ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              <span className="text-center font-semibold">
                {pending === '/register' ? t.common.loading : wc.register}
              </span>
            </Button>

            <div className="flex items-center gap-3 py-4">
              <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent to-stone-500/35" />
              <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {wc.orDivider}
              </span>
              <div className="h-px min-w-0 flex-1 bg-gradient-to-l from-transparent to-stone-500/35" />
            </div>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className={cn(
                'inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 border-2 border-white/[0.34] bg-white/[0.04] text-stone-100 hover:border-white/50 hover:bg-white/[0.1] hover:text-white hover:shadow-sm',
                btnMotion
              )}
              disabled={busy}
              onClick={() => go('/login?google=1')}
            >
              {pending === '/login?google=1' ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <GoogleGIcon className="h-[18px] w-[18px]" />
              )}
              <span className="text-center font-medium leading-snug">
                {pending === '/login?google=1' ? t.common.loading : wc.google}
              </span>
            </Button>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 pt-1 text-xs text-stone-500">
            <Link
              to="/privacy"
              className="font-medium text-stone-400 underline-offset-[4px] transition-colors hover:text-stone-200 hover:underline"
            >
              {wc.privacy}
            </Link>
            <span className="select-none text-stone-600" aria-hidden>
              ·
            </span>
            <Link
              to="/terms"
              className="font-medium text-stone-400 underline-offset-[4px] transition-colors hover:text-stone-200 hover:underline"
            >
              {wc.terms}
            </Link>
            <span className="select-none text-stone-600" aria-hidden>
              ·
            </span>
            <Link
              to="/support"
              className="font-medium text-stone-400 underline-offset-[4px] transition-colors hover:text-stone-200 hover:underline"
            >
              {wc.support}
            </Link>
          </nav>
        </motion.div>
      </PageContainer>
    </NightRideBackground>
  )
}
