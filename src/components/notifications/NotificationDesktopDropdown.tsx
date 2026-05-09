import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef } from 'react'

/**
 * Renders inside a `position: relative` wrapper around the navbar bell.
 * Anchored: `top: calc(100% + 8px)`, `right: 0` (aligned to bell cluster).
 */
export function NotificationDesktopDropdown({
  open,
  onClose,
  triggerRef,
  headerActions,
  children,
}: {
  open: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLElement | null>
  headerActions: ReactNode
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      onClose()
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onClose, triggerRef])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Obavještenja"
      className="absolute right-0 top-[calc(100%+8px)] z-[360] flex w-[380px] max-h-[520px] flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
    >
      <span
        className="pointer-events-none absolute -top-[6px] right-3 z-10 block h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-white drop-shadow-[0_-1px_0_#E5E7EB]"
        aria-hidden
      />
      <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3">
        <h2 className="min-w-0 shrink text-[18px] font-bold text-brand-navy">Obavještenja</h2>
        <div className="flex shrink-0 items-center justify-end gap-2">{headerActions}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  )
}
