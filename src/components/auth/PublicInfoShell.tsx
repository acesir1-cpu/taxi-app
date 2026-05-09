import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { AuthHeroPanel } from './AuthHeroPanel'

const FORM_HERO_DESKTOP = '/brand-hero-desktop.png'
const FORM_HERO_MOBILE = '/brand-hero-mobile.png'

/**
 * Split layout (Politika / Uslovi / Podrška) kao auth flow.
 * U /app/* kontekstu samo sadržaj bez hero panela.
 */
export function PublicInfoShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const embedInApp = pathname.startsWith('/app')

  useEffect(() => {
    if (!embedInApp) {
      document.body.classList.add('auth-screen')
      return () => {
        document.body.classList.remove('auth-screen')
      }
    }
  }, [embedInApp])

  if (embedInApp) {
    return (
      <div className="auth-public-info-embed w-full">
        <div className={cn('form-panel min-h-0 w-full flex-1')}>{children}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid min-h-screen min-h-[100svh] min-h-[100dvh] w-full',
        'grid-cols-1 md:grid-cols-[45fr_55fr]',
      )}
    >
      <AuthHeroPanel className="order-2 hidden min-h-0 md:order-1 md:flex md:h-full" />

      <div
        className={cn(
          'relative z-0 order-1 flex min-h-[100dvh] flex-col overflow-hidden md:order-2 md:min-h-0',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 hidden bg-cover bg-center bg-no-repeat md:block"
          style={{ backgroundImage: `url('${FORM_HERO_DESKTOP}')` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_top] bg-no-repeat md:hidden"
          style={{ backgroundImage: `url('${FORM_HERO_MOBILE}')` }}
          aria-hidden
        />
        <div className="auth-public-info-frost" aria-hidden />

        <div className="form-panel relative z-10 min-h-0 w-full flex-1">{children}</div>
      </div>
    </div>
  )
}
