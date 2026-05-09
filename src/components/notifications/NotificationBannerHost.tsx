import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMe } from '../../hooks/useMe'
import { useNotificationBannerStore } from '../../store/notificationBannerStore'

const BANNER_MS = 4000

export function NotificationBannerHost() {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const current = useNotificationBannerStore((s) => s.current)
  const dismiss = useNotificationBannerStore((s) => s.dismiss)

  useEffect(() => {
    if (!current) return
    const id = window.setTimeout(() => dismiss(), BANNER_MS)
    return () => window.clearTimeout(id)
  }, [current, dismiss])

  if (!me || !current || current.accountId !== me.account.id) return null

  return (
    <AnimatePresence>
      {current ? (
        <motion.div
          key={current.id}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="pointer-events-none fixed left-0 right-0 top-0 z-[1500] flex justify-center px-3 pt-[env(safe-area-inset-top,0px)]"
        >
          <button
            type="button"
            className="pointer-events-auto flex h-[60px] w-full max-w-lg items-center gap-3 rounded-b-2xl border border-slate-200/90 bg-white px-4 text-left shadow-lg shadow-slate-900/10"
            onClick={() => {
              dismiss()
              navigate(current.path)
            }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-brand-navy">{current.title}</span>
              <span className="mt-0.5 block truncate text-[12px] text-[#6B7280]">{current.body}</span>
            </span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
