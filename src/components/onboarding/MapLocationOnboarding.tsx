import { useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

const PAD = 10

type Step = 1 | 2 | 3

function useBox(ref: RefObject<HTMLElement | null>, active: boolean) {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    if (!active) {
      setBox(null)
      return
    }

    let alive = true
    let ro: ResizeObserver | null = null
    let raf = 0
    let attachTries = 0
    let measureTries = 0
    const maxAttach = 40
    const maxMeasure = 28

    const cancelRaf = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const read = () => {
      if (!alive) return
      const el = ref.current
      if (!el || !el.isConnected) return
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const edge = 4
      const left = Math.max(edge, r.left - PAD)
      const top = Math.max(edge, r.top - PAD)
      const right = Math.min(vw - edge, r.right + PAD)
      const bottom = Math.min(vh - edge, r.bottom + PAD)
      const width = Math.max(0, right - left)
      const height = Math.max(0, bottom - top)

      if (width < 8 || height < 8) {
        measureTries += 1
        if (alive && measureTries < maxMeasure) {
          cancelRaf()
          raf = requestAnimationFrame(read)
        }
        return
      }

      setBox({ left, top, width, height })
    }

    const attach = () => {
      if (!alive) return
      const el = ref.current
      if (!el) {
        attachTries += 1
        if (alive && attachTries < maxAttach) {
          cancelRaf()
          raf = requestAnimationFrame(attach)
        }
        return
      }
      measureTries = 0
      read()
      ro = new ResizeObserver(read)
      ro.observe(el)
      window.addEventListener('scroll', read, true)
      window.addEventListener('resize', read)
    }

    attach()

    return () => {
      alive = false
      cancelRaf()
      ro?.disconnect()
      window.removeEventListener('scroll', read, true)
      window.removeEventListener('resize', read)
    }
  }, [active, ref])

  return box
}

function DimPanels({
  hole,
  onDimClick,
}: {
  hole: { left: number; top: number; width: number; height: number }
  onDimClick: () => void
}) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const { left, top, width, height } = hole
  const l = Math.max(0, left)
  const t = Math.max(0, top)
  const r = Math.min(vw, left + width)
  const b = Math.min(vh, top + height)
  const h = Math.max(0, b - t)

  const panel =
    'fixed z-[60] cursor-pointer border-0 bg-brand-navy/40 p-0 backdrop-blur-[2px] transition-[background-color] duration-200 hover:bg-brand-navy/45'

  return (
    <>
      <button type="button" tabIndex={-1} aria-hidden className={cn(panel, 'top-0 left-0 w-full')} style={{ height: t }} onClick={onDimClick} />
      <button type="button" tabIndex={-1} aria-hidden className={panel} style={{ top: t, left: 0, width: l, height: h }} onClick={onDimClick} />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className={panel}
        style={{ top: t, left: r, width: Math.max(0, vw - r), height: h }}
        onClick={onDimClick}
      />
      <button type="button" tabIndex={-1} aria-hidden className={cn(panel, 'left-0 w-full')} style={{ top: b, height: Math.max(0, vh - b) }} onClick={onDimClick} />
    </>
  )
}

function StepDots({ step, total }: { step: Step; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const n = (i + 1) as Step
        const active = n === step
        const done = n < step
        return (
          <span
            key={n}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300 ease-out',
              active ? 'w-6 bg-brand-teal' : 'w-1.5',
              !active && done && 'bg-brand-teal/35',
              !active && !done && 'bg-slate-200'
            )}
          />
        )
      })}
    </div>
  )
}

export function MapLocationOnboarding({
  open,
  step,
  mapRef,
  inputsRef,
  estimateRef,
  messages,
  onStepChange,
  onComplete,
}: {
  open: boolean
  step: Step
  mapRef: RefObject<HTMLElement | null>
  inputsRef: RefObject<HTMLElement | null>
  estimateRef: RefObject<HTMLElement | null>
  messages: {
    badge: string
    step1: string
    step2: string
    step3: string
    gotIt: string
    skip: string
  }
  onStepChange: (s: Step) => void
  onComplete: () => void
}) {
  const refForStep = step === 1 ? mapRef : step === 2 ? inputsRef : estimateRef
  const hole = useBox(refForStep, open)

  if (typeof document === 'undefined') return null

  const dismiss = () => onComplete()

  const gotIt = () => {
    if (step < 3) onStepChange((step + 1) as Step)
    else dismiss()
  }

  const hint = step === 1 ? messages.step1 : step === 2 ? messages.step2 : messages.step3

  const body = (
    <AnimatePresence>
      {open && hole && hole.width >= 8 && hole.height >= 8 ? (
        <motion.div
          key="map-guide"
          className="pointer-events-none fixed inset-0 z-[59]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <DimPanels hole={hole} onDimClick={dismiss} />

          <div
            className="pointer-events-none fixed z-[61] rounded-xl ring-2 ring-brand-teal/55 ring-offset-1 ring-offset-transparent sm:rounded-2xl sm:ring-offset-2"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
              boxShadow: '0 0 0 1px rgba(20, 184, 166, 0.2), 0 12px 40px -8px rgba(7, 21, 39, 0.2)',
            }}
          />

          {step === 1 ? (
            <div
              className="pointer-events-none fixed z-[62]"
              style={{
                left: hole.left + hole.width / 2,
                top: hole.top + hole.height / 2,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="relative flex h-9 w-9 sm:h-11 sm:w-11">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal/25 [animation-duration:2s]" />
                <span className="relative inline-flex h-9 w-9 rounded-full border-2 border-white shadow-md ring-2 ring-brand-teal/30 bg-white/90 sm:h-11 sm:w-11" />
                <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-brand-teal sm:h-2.5 sm:w-2.5" />
              </span>
            </div>
          ) : null}

          <motion.div
            key={step}
            role="dialog"
            aria-modal="false"
            aria-labelledby="map-guide-title"
            className={cn(
              'pointer-events-auto fixed z-[70]',
              'rounded-2xl border border-black/[0.12] bg-white text-brand-navy',
              'shadow-card ring-1 ring-slate-900/[0.04]',
              /* Mobil: puna širina s rubovima, iznad donje nav (z-40) + fixed CTA trake (~bottom-20) */
              'max-md:inset-x-3 max-md:bottom-[max(11.5rem,calc(10.75rem+env(safe-area-inset-bottom,0px)))] max-md:max-h-[min(40svh,280px)] max-md:overflow-y-auto max-md:overflow-x-hidden max-md:overscroll-contain',
              'max-md:w-auto max-md:max-w-none',
              'p-4 sm:p-5 md:p-6 md:max-h-none md:overflow-visible',
              'md:left-1/2 md:w-[min(100%-2rem,24rem)] md:-translate-x-1/2'
            )}
            style={
              typeof window !== 'undefined' && window.innerWidth >= 768
                ? {
                    top: Math.min(Math.max(16, hole.top + hole.height + 16), window.innerHeight - 220),
                  }
                : undefined
            }
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
              <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-teal sm:text-[11px] sm:tracking-[0.14em]">
                {messages.badge}
              </span>
              <StepDots step={step} total={3} />
            </div>
            <p
              id="map-guide-title"
              className="text-center text-[14px] font-semibold leading-snug tracking-tight text-brand-navy sm:text-[15px] sm:leading-relaxed md:text-base"
            >
              {hint}
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-9 touch-manipulation text-sm text-slate-500 hover:text-brand-navy sm:min-h-10"
                onClick={dismiss}
              >
                {messages.skip}
              </Button>
              <Button
                type="button"
                variant="default"
                className="min-h-11 w-full shrink-0 touch-manipulation rounded-xl text-[15px] font-bold shadow-sm sm:w-auto sm:min-w-[7.5rem] sm:text-sm"
                onClick={gotIt}
              >
                {messages.gotIt}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return createPortal(body, document.body)
}
