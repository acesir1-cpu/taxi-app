import { AnimatePresence, motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

const notificationSheetMarkAllReadClass =
  'text-[14px] font-semibold text-[#6B7280] transition-colors hover:text-[#4B5563] disabled:pointer-events-none disabled:opacity-40'

const notificationSheetDeleteAllClass =
  'rounded-lg border border-red-200/90 bg-red-50/90 px-3 py-1.5 text-[13px] font-semibold text-red-600 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-red-300 hover:bg-red-100/90 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40'

/** Gray text action — use in notification sheet header (right side, before delete). */
export function NotificationSheetMarkAllReadButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn(notificationSheetMarkAllReadClass, className)} {...props} />
}

/** Soft red pill-style button — use in notification sheet header (rightmost). */
export function NotificationSheetDeleteAllButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn(notificationSheetDeleteAllClass, className)} {...props} />
}

export function NotificationBottomSheet({
  open,
  onClose,
  headerActions,
  children,
}: {
  open: boolean
  onClose: () => void
  headerActions: ReactNode
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[360]">
          <motion.button
            type="button"
            aria-label="Zatvori obavještenja"
            className="absolute inset-0 bg-[rgba(0,0,0,0.4)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Obavještenja"
            className="absolute bottom-0 left-0 right-0 flex h-[60vh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-14px_36px_rgba(15,23,42,0.22)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <span className="mt-[10px] h-1 w-9 self-center rounded-[2px] bg-[#D1D5DB]" aria-hidden />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <h2 className="min-w-0 shrink text-[18px] font-bold text-brand-navy">Obavještenja</h2>
              <div className="flex shrink-0 items-center justify-end gap-2">{headerActions}</div>
            </div>
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
