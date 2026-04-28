import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { useToastStore } from '../../store/notificationStore'
import { cn } from '../../lib/utils'

export function ToastHost() {
  const closeLabel = strings().common.close
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              'pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
              t.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
              t.type === 'error' && 'border-red-200 bg-red-50 text-red-900',
              t.type === 'info' && 'border-slate-200 bg-white text-brand-navy'
            )}
          >
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              type="button"
              className="rounded-md p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              onClick={() => dismiss(t.id)}
              aria-label={closeLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
