import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { strings } from '../i18n/strings'
import { verifyCode } from '../services/authApi'
import { clearPendingVerifyAccountId, getPendingVerifyAccountId } from '../utils/storage'
import { useToastStore } from '../store/notificationStore'
import { AuthCard } from '../components/auth/AuthCard'
import { AuthScreenLayout } from '../components/auth/AuthScreenLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function VerifyPage() {
  const t = strings()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [code, setCode] = useState('')

  const accountId = getPendingVerifyAccountId()

  const mut = useMutation({
    mutationFn: () => {
      if (!accountId) throw new Error('no_account')
      return verifyCode(accountId, code.replace(/\s/g, ''))
    },
    onSuccess: async (res) => {
      const s = strings()
      if ('error' in res) {
        push(res.error === 'wrong' ? s.auth.wrongCode : s.common.error, 'error')
        return
      }
      clearPendingVerifyAccountId()
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(s.notifications.accountCreated, 'success')
      navigate('/app/order', { replace: true })
    },
    onError: (e) => {
      const s = strings()
      if ((e as Error).message === 'no_account') {
        push(s.auth.noActiveRegistration, 'error')
        navigate('/register', { replace: true })
        return
      }
      push(s.common.error, 'error')
    },
  })

  if (!accountId) {
    return (
      <AuthScreenLayout>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-lg"
        >
          <AuthCard title={t.brand} subtitle={t.auth.verifyTitle}>
            <p className="text-sm text-stone-400">{t.auth.verifyContinueRegistration}</p>
            <Button className="mt-4 w-full" onClick={() => navigate('/register')}>
              {t.welcome.register}
            </Button>
          </AuthCard>
        </motion.div>
      </AuthScreenLayout>
    )
  }

  return (
    <AuthScreenLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-lg"
      >
        <AuthCard title={t.brand} subtitle={t.auth.verifyTitle}>
          <div className="space-y-4">
            <p className="-mt-1 text-sm text-center text-stone-300">{t.auth.verifyHint}</p>
            <div>
              <label className="sr-only" htmlFor="code">
                {t.auth.verifyCodeLabel}
              </label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.4em] font-semibold"
              />
              <p className="mt-2 text-xs text-stone-500">{t.auth.verifyDemoCode}</p>
            </div>
            <Button className="w-full" disabled={code.length !== 6 || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? t.common.loading : t.auth.verifySubmit}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full border-2 border-white/30 bg-white/[0.05] text-stone-100 hover:bg-white/[0.12] hover:text-white"
              onClick={() => push(strings().auth.codeSent, 'info')}
            >
              {t.auth.resend}
            </Button>
            <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 pt-1 text-xs text-stone-500">
              <Link to="/privacy" className="font-medium text-stone-400 transition-colors hover:text-stone-200 hover:underline">
                {t.welcome.privacy}
              </Link>
              <span className="select-none text-stone-600">·</span>
              <Link to="/terms" className="font-medium text-stone-400 transition-colors hover:text-stone-200 hover:underline">
                {t.welcome.terms}
              </Link>
              <span className="select-none text-stone-600">·</span>
              <Link to="/support" className="font-medium text-stone-400 transition-colors hover:text-stone-200 hover:underline">
                {t.welcome.support}
              </Link>
            </nav>
          </div>
        </AuthCard>
      </motion.div>
    </AuthScreenLayout>
  )
}
