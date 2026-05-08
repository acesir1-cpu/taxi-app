import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/** Bottom tab bar shell shared by passenger and driver (mobile). Matches primary app cards: solid white, 1px slate border. */
export const mobileTabBarNavShellClassName =
  'fixed bottom-0 left-0 right-0 z-[110] flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] lg:hidden'

export function mobileTabBarNavLinkClass({ isActive }: { isActive: boolean }) {
  return mobileTabBarItemClass(isActive)
}

export function mobileTabBarItemClass(isActive: boolean) {
  return cn(
    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all duration-150 ease-out',
    isActive ? 'bg-brand-yellow/15 text-brand-yellow-dark' : 'text-slate-500 hover:text-brand-navy'
  )
}

export const mobileNavOverflowMenuLinkClassName =
  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand-navy'

export const mobileNavOverflowMenuDangerClassName =
  'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700'

export function MobileNavOverflowMenu({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[105] bg-black/30 lg:hidden"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] mx-auto w-[min(92vw,26rem)] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  )
}
