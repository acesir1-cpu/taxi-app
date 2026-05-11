import { useQuery } from '@tanstack/react-query'
import { MapPin, X } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Location } from '../../types/domain'
import { strings } from '../../i18n/strings'
import { searchLocations } from '../../services/locationApi'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { cn } from '../../lib/utils'

const GEOCODE_DEBOUNCE_MS = 400

export function LocationSearch({
  label,
  value,
  onChange,
  placeholder,
  emptyHint,
  rightAction,
  formReset,
}: {
  label: string
  value: Location | null
  onChange: (loc: Location | null) => void
  placeholder: string
  /** Poruka kada nema pogodaka (npr. nakon geokodiranja). */
  emptyHint?: string
  rightAction?: ReactNode
  /** Inline clear (e.g. full form reset) shown before `rightAction`. */
  formReset?: { onClick: () => void; ariaLabel: string; visible: boolean }
}) {
  const t = strings()
  const [q, setQ] = useState(value?.label ?? '')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const portalListRef = useRef<HTMLUListElement>(null)
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties | null>(null)
  const trimmedLen = q.trim().length
  const [debouncedQ, setDebouncedQ] = useState(q)

  useEffect(() => {
    setQ(value?.label ?? '')
  }, [value?.id, value?.label])

  useEffect(() => {
    if (trimmedLen < 3) {
      setDebouncedQ(q)
      return
    }
    const t = setTimeout(() => setDebouncedQ(q), GEOCODE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q, trimmedLen])

  const searchInput = trimmedLen < 3 ? q : debouncedQ

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['locSearch', searchInput],
    queryFn: ({ signal }) => searchLocations(searchInput, signal),
    enabled: open,
    staleTime: 60_000,
  })

  useEffect(() => {
    function onDoc(e: PointerEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || portalListRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setFloatingStyle(null)
      return
    }
    const positionList = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vv = window.visualViewport
      const gap = 6
      let spaceBelow: number
      let spaceAbove: number
      if (vv) {
        spaceBelow = vv.offsetTop + vv.height - r.bottom - gap
        spaceAbove = r.top - vv.offsetTop - gap
      } else {
        spaceBelow = window.innerHeight - r.bottom - gap
        spaceAbove = r.top - gap
      }
      const minReadable = 112
      const flip = spaceBelow < minReadable && spaceAbove > spaceBelow
      const rawMax = Math.max(96, Math.min(208, flip ? spaceAbove : spaceBelow))
      const maxH = Number.isFinite(rawMax) ? rawMax : 208

      setFloatingStyle({
        position: 'fixed',
        left: r.left,
        width: r.width,
        maxHeight: maxH,
        zIndex: 100,
        ...(flip
          ? { bottom: window.innerHeight - r.top + gap, top: 'auto' }
          : { top: r.bottom + gap, bottom: 'auto' }),
      })
    }

    positionList()
    const vv = window.visualViewport
    vv?.addEventListener('resize', positionList)
    vv?.addEventListener('scroll', positionList)
    window.addEventListener('resize', positionList)
    window.addEventListener('scroll', positionList, true)
    return () => {
      vv?.removeEventListener('resize', positionList)
      vv?.removeEventListener('scroll', positionList)
      window.removeEventListener('resize', positionList)
      window.removeEventListener('scroll', positionList, true)
    }
  }, [open, q, results.length, isFetching])

  const showFormReset = Boolean(formReset?.visible)
  const inputPadRight = showFormReset && rightAction ? 'pr-[7.5rem]' : showFormReset ? 'pr-12' : rightAction ? 'pr-11' : undefined

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      <div ref={anchorRef} className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          className={cn('h-11 pl-9', inputPadRight)}
          placeholder={placeholder}
          value={q}
          onFocus={(e) => {
            setOpen(true)
            requestAnimationFrame(() => {
              e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })
            })
          }}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            onChange(null)
          }}
        />
        {showFormReset || rightAction ? (
          <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
            {showFormReset && formReset ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition active:scale-[0.98]"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  formReset.onClick()
                }}
                aria-label={formReset.ariaLabel}
              >
                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
            {rightAction}
          </div>
        ) : null}
        {open && floatingStyle && typeof document !== 'undefined'
          ? createPortal(
              <ul
                ref={portalListRef}
                className="overflow-auto rounded-xl border border-brand-border bg-white py-1 shadow-lg"
                style={floatingStyle}
                role="listbox"
              >
                {isFetching && results.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-500">{t.common.loading}</li>
                ) : null}
                {!isFetching && results.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-500">{emptyHint ?? t.order.geocodeEmpty}</li>
                ) : null}
                {results.map((loc) => (
                  <li key={loc.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50',
                        value?.id === loc.id && 'bg-slate-50'
                      )}
                      onClick={() => {
                        onChange(loc)
                        setQ(loc.label)
                        setOpen(false)
                      }}
                    >
                      <span className="font-semibold text-brand-navy">{loc.label}</span>
                      <span className="text-xs text-slate-500">{loc.address}</span>
                    </button>
                  </li>
                ))}
              </ul>,
              document.body
            )
          : null}
      </div>
    </div>
  )
}
