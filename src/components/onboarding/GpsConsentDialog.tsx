import { Navigation } from 'lucide-react'
import { createPortal } from 'react-dom'
import { strings } from '../../i18n/strings'
import { Button } from '../ui/button'

export function GpsConsentDialog({
  open,
  onAllow,
  onDeny,
}: {
  open: boolean
  onAllow: () => void
  onDeny: () => void
}) {
  const t = strings()
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-end bg-slate-950/35 px-4 pb-4 backdrop-blur-sm sm:items-center sm:justify-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gps-consent-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Navigation className="h-5 w-5" aria-hidden />
        </div>
        <h2 id="gps-consent-title" className="text-lg font-extrabold tracking-tight text-brand-navy">
          {t.onboarding.gpsTitle}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{t.onboarding.gpsBody}</p>
        <div className="mt-5 grid gap-3">
          <Button type="button" className="w-full" onClick={onAllow}>
            {t.onboarding.gpsAllow}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onDeny}>
            {t.onboarding.gpsDeny}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
