import { useNavigate, useOutletContext } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import type { AppOutletContext } from '../types/appContext'
import { strings } from '../i18n/strings'
import { useToastStore } from '../store/notificationStore'
import { Button } from '../components/ui/button'

export function ActiveRideRedirectPage() {
  const t = strings()
  const { activeRide } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const push = useToastStore((s) => s.push)
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (activeRide) {
      navigate(`/app/ride/${activeRide.id}`, { replace: true })
    } else {
      // Guard against duplicate toasts in React StrictMode double-effect runs.
      if (!notifiedRef.current) {
        push(strings().notifications.noActiveRide, 'info')
        notifiedRef.current = true
      }
    }
  }, [activeRide, navigate, push])

  if (activeRide) {
    return <p className="p-6 text-center text-sm text-slate-600">{t.common.loading}</p>
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-8 text-center shadow-card">
        <h2 className="text-lg font-semibold text-brand-navy">{t.notifications.noActiveRide}</h2>
        <p className="mt-2 text-sm text-slate-600">{t.history.empty}</p>
        <Button className="mt-5" onClick={() => navigate('/app/order')}>
          {t.nav.order}
        </Button>
      </div>
    </div>
  )
}
