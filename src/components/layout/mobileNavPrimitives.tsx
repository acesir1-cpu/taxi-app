import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { strings } from '../../i18n/strings'
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

/** @deprecated Use mobileNavOverflowSheetRowBase + divider classes for bottom sheet rows. */
export const mobileNavOverflowMenuLinkClassName =
  'flex h-14 w-full items-center gap-3 border-b border-slate-200 px-4 text-left text-[15px] font-medium text-slate-800 no-underline transition-colors active:bg-slate-50'

/** @deprecated Use mobileNavOverflowSheetDangerRow. */
export const mobileNavOverflowMenuDangerClassName =
  'flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-medium text-[#EF4444] no-underline transition-colors active:bg-red-50'

/**
 * Pixel height of the fixed tab bar, set by ResizeObserver on the nav (see MobileBottomNav /
 * DriverMobileNav). Fallback is --mobile-nav-height only — do not add safe-area here: padding for
 * the home indicator is already inside the nav’s border box.
 */
const sheetBottomOffset = 'var(--mobile-nav-shell-height, var(--mobile-nav-height, 5.25rem))'

export const mobileNavOverflowSheetRowBase =
  'flex h-14 w-full shrink-0 items-center gap-3 px-4 text-left text-[15px] font-medium text-slate-800 no-underline transition-colors active:bg-slate-50'

export const mobileNavOverflowSheetIconClass = 'h-5 w-5 shrink-0 text-slate-600'

export const mobileNavOverflowSheetRowDivider = 'border-b border-slate-200'

export const mobileNavOverflowSheetRowDividerDanger = 'border-b border-[#EF4444]'

export const mobileNavOverflowSheetDangerRow = cn(
  mobileNavOverflowSheetRowBase,
  'text-[#EF4444] active:bg-red-50/80'
)

export const mobileNavOverflowSheetDangerIconClass = 'h-5 w-5 shrink-0 text-[#EF4444]'

export function MobileNavOverflowMenu({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const t = strings()
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="nav-overflow-backdrop"
          role="presentation"
          className="fixed inset-0 z-[105] bg-black/30 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
      ) : null}
      {open ? (
        <motion.div
          key="nav-overflow-sheet"
          role="dialog"
          aria-modal="true"
          className="fixed left-0 right-0 z-[106] flex max-h-[min(85vh,calc(100dvh-env(safe-area-inset-bottom)))] flex-col overflow-hidden rounded-t-[20px] border border-b-0 border-slate-200 bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.12)] lg:hidden"
          style={{ bottom: sheetBottomOffset }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 justify-center pt-3 pb-2">
            <button
              type="button"
              className="flex h-6 w-11 items-center justify-center rounded-md text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              aria-label={t.common.close}
              onClick={onClose}
            >
              <span className="block h-1 w-[36px] shrink-0 rounded-full bg-[#D1D5DB]" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-1">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
