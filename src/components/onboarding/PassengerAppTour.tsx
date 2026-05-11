import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { setPassengerAppTourCompleted } from '../../lib/passengerAppTourStorage'
import { Button } from '../ui/button'

const STEPS = [
  { path: '/app/order', target: 'order' as const },
  { path: '/app/active', target: 'active' as const },
  { path: '/app/scheduled', target: 'scheduled' as const },
  { path: '/app/history', target: 'history' as const },
  { path: '/app/profile', target: 'profile' as const },
]

export const URBANFLOW_EXPAND_ORDER_SHEET = 'urbanflow:expand-order-sheet'
export const URBANFLOW_PASSENGER_APP_TOUR_COMPLETE = 'urbanflow:passenger-app-tour-complete'

export function PassengerAppTour({
  accountId,
  onComplete,
}: {
  accountId: string
  onComplete?: () => void
}) {
  const t = strings()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const messages = [
    { title: t.onboarding.tourStepOrderTitle, body: t.onboarding.tourStepOrderBody },
    { title: t.onboarding.tourStepActiveTitle, body: t.onboarding.tourStepActiveBody },
    { title: t.onboarding.tourStepScheduledTitle, body: t.onboarding.tourStepScheduledBody },
    { title: t.onboarding.tourStepHistoryTitle, body: t.onboarding.tourStepHistoryBody },
    { title: t.onboarding.tourStepProfileTitle, body: t.onboarding.tourStepProfileBody },
  ]

  const finish = useCallback(() => {
    setPassengerAppTourCompleted(accountId)
    window.dispatchEvent(new CustomEvent(URBANFLOW_PASSENGER_APP_TOUR_COMPLETE))
    onComplete?.()
    navigate('/app/order', { replace: true })
  }, [accountId, navigate, onComplete])

  useEffect(() => {
    const target = STEPS[step]?.path
    if (!target) return
    navigate(target)
  }, [step, navigate])

  useEffect(() => {
    const target = STEPS[step]
    if (!target) return
    const tmr = window.setTimeout(() => {
      document.querySelector(`[data-passenger-tour-target="${target.target}"]`)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    }, 280)
    return () => window.clearTimeout(tmr)
  }, [step])

  useEffect(() => {
    if (step !== 0) return
    const tmr = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(URBANFLOW_EXPAND_ORDER_SHEET))
    }, 320)
    return () => window.clearTimeout(tmr)
  }, [step])

  const { title, body } = messages[step] ?? messages[0]!
  const total = STEPS.length
  const isLast = step >= total - 1

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[460] flex items-end justify-center bg-slate-950/45 px-4 pb-6 backdrop-blur-[2px] sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-tour-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {t.onboarding.tourProgress.replace('{current}', String(step + 1)).replace('{total}', String(total))}
        </p>
        <h2 id="app-tour-title" className="mt-1 text-lg font-extrabold tracking-tight text-brand-navy">
          {title}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {step > 0 ? (
            <Button type="button" variant="secondary" className="min-w-[6rem] flex-1" onClick={() => setStep((s) => s - 1)}>
              {t.onboarding.tourBack}
            </Button>
          ) : null}
          <Button type="button" variant="outlineThin" className="min-w-[6rem]" onClick={finish}>
            {t.onboarding.tourSkip}
          </Button>
          <Button type="button" className="min-w-[6rem] flex-1" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
            {isLast ? t.onboarding.tourFinish : t.onboarding.tourNext}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
