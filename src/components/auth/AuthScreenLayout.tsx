import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { strings } from '../../i18n/strings'
import { AppLogo } from '../brand/AppLogo'
import { PageContainer } from '../layout/PageContainer'
import { NightRideBackground } from '../common/NightRideBackground'

/** Ista brand pozadina kao welcome, s jačim „frost“ slojem za čitljivost formi. */
export function AuthScreenLayout({ children }: { children: ReactNode }) {
  const t = strings()

  useEffect(() => {
    document.body.classList.add('auth-screen')
    return () => {
      document.body.classList.remove('auth-screen')
    }
  }, [])

  return (
    <NightRideBackground variant="auth">
      <PageContainer className="relative z-10 flex min-h-screen min-h-[100svh] min-h-[100dvh] flex-col px-4 py-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          className="flex shrink-0 justify-center pb-5 pt-1"
        >
          <AppLogo variant="dark" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0"
        >
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-navy/12 bg-white/92 px-4 py-2.5 text-sm font-semibold text-brand-navy shadow-md shadow-slate-900/8 backdrop-blur-md transition-colors hover:border-brand-navy/22 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <ChevronLeft className="h-5 w-5 shrink-0 -ml-0.5 text-brand-navy" strokeWidth={2.5} aria-hidden />
            {t.auth.backToWelcome}
          </Link>
        </motion.div>
        <div className="flex flex-1 flex-col justify-center pb-6 pt-2">{children}</div>
      </PageContainer>
    </NightRideBackground>
  )
}
