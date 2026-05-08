import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { AuthCard } from '../components/auth/AuthCard'
import { AuthScreenLayout } from '../components/auth/AuthScreenLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useToastStore } from '../store/notificationStore'

export function ResetPasswordPage() {
  const t = strings()
  const push = useToastStore((s) => s.push)
  const [email, setEmail] = useState('')

  return (
    <AuthScreenLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-lg"
      >
        <AuthCard title={t.auth.resetPasswordTitle} subtitle={t.auth.resetPasswordSubtitle}>
          <div className="space-y-3">
            <div className="space-y-1.5 text-left">
              <p className="text-sm text-stone-300">{t.auth.email}</p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder={t.auth.resetPasswordPlaceholder}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!email.trim()) {
                  push(t.auth.resetPasswordEmailRequired, 'error')
                  return
                }
                push(t.auth.resetPasswordSent, 'success')
              }}
            >
              {t.auth.resetPasswordSend}
            </Button>
            <Link to="/login" className="block pt-1 text-center text-sm font-medium text-stone-300 hover:text-white hover:underline">
              {t.auth.backToLogin}
            </Link>
          </div>
        </AuthCard>
      </motion.div>
    </AuthScreenLayout>
  )
}
