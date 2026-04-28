import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { useToastStore } from '../../store/notificationStore'
import { cn } from '../../lib/utils'

export function ToastHost() {
  const closeLabel = strings().common.close
  const { toasts, dismiss } = useToastStore()
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[1400] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 24, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 24, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[10px] border px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.15)]',
              t.type === 'success' && 'border-emerald-200 bg-emerald-500 text-white',
              t.type === 'error' && 'border-red-200 bg-red-500 text-white',
              t.type === 'info' && 'border-blue-200 bg-blue-500 text-white'
            )}
          >
            <span className="mt-0.5 shrink-0">
              {t.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : null}
              {t.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : null}
              {t.type === 'info' ? <Info className="h-5 w-5" /> : null}
            </span>
            <p className="flex-1 text-sm font-semibold">{t.message}</p>
            <button
              type="button"
              className="rounded-md p-1 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
