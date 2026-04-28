import { Car, History, Navigation, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-all duration-150 ease-out',
    isActive ? 'bg-brand-navy/[0.04] text-brand-navy' : 'text-slate-600 hover:text-brand-navy'
  )

export function MobileBottomNav() {
  const t = strings()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex border-t border-black/[0.1] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      role="navigation"
    >
      <NavLink to="/app/order" className={linkClass}>
        <Car className="h-5 w-5" />
        {t.nav.order}
      </NavLink>
      <NavLink to="/app/active" className={linkClass}>
        <Navigation className="h-5 w-5" />
        {t.nav.activeShort}
      </NavLink>
      <NavLink to="/app/history" className={linkClass}>
        <History className="h-5 w-5" />
        {t.nav.history}
      </NavLink>
      <NavLink to="/app/profile" className={linkClass}>
        <User className="h-5 w-5" />
        {t.nav.profile}
      </NavLink>
    </nav>
  )
}
