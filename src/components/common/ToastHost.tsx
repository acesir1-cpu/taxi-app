import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { useToastStore } from '../../store/notificationStore'
import { cn } from '../../lib/utils'
import type { ToastType } from '../../store/notificationStore'

const variantIcon = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const

function toastSurfaceClass(type: ToastType) {
  switch (type) {
    case 'success':
      return 'border-emerald-100/90 bg-white ring-1 ring-emerald-500/[0.06]'
    case 'error':
      return 'border-red-100/90 bg-white ring-1 ring-red-500/[0.06]'
    default:
      return 'border-[#E5E7EB] bg-[#FAFBFC] ring-1 ring-slate-900/[0.03]'
  }
}

function toastBadgeClass(type: ToastType) {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 text-emerald-600'
    case 'error':
      return 'bg-red-50 text-red-600'
    default:
      return 'bg-blue-50 text-blue-600'
  }
}

export function ToastHost() {
  const closeLabel = strings().common.close
  const { toasts, dismiss } = useToastStore()
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[1400] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = variantIcon[t.type]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{
                duration: 0.24,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-center gap-3.5 rounded-[13px] border px-3.5 py-2.5 shadow-card',
                toastSurfaceClass(t.type)
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  toastBadgeClass(t.type)
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4 stroke-[2.25]" />
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-brand-navy">
                {t.message}
              </p>
              <button
                type="button"
                className={cn(
                  'group -mr-0.5 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors',
                  'hover:bg-gray-100 hover:text-gray-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                )}
                onClick={() => dismiss(t.id)}
                aria-label={closeLabel}
              >
                <X className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
