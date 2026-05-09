import { useQuery } from '@tanstack/react-query'
import { MapPin, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
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
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const showFormReset = Boolean(formReset?.visible)
  const inputPadRight = showFormReset && rightAction ? 'pr-[7.5rem]' : showFormReset ? 'pr-12' : rightAction ? 'pr-11' : undefined

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          className={cn('h-11 pl-9', inputPadRight)}
          placeholder={placeholder}
          value={q}
          onFocus={() => setOpen(true)}
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
        {open ? (
          <ul
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-brand-border bg-white py-1 shadow-lg"
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
          </ul>
        ) : null}
      </div>
    </div>
  )
}
