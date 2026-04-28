import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { buildLoginSchema, type LoginFormValues } from '../schemas/auth'
import { googleLogin, login } from '../services/authApi'
import { useToastStore } from '../store/notificationStore'
import { AuthCard } from '../components/auth/AuthCard'
import { AuthScreenLayout } from '../components/auth/AuthScreenLayout'
import { GoogleGIcon } from '../components/icons/GoogleGIcon'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function LoginPage() {
  const t = strings()
  const loginSchema = useMemo(() => buildLoginSchema(t), [t])
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } })

  const mut = useMutation({
    mutationFn: (v: LoginFormValues) => login(v.identifier, v.password),
    onSuccess: async (res) => {
      const s = strings()
      if ('error' in res) {
        if (res.error === 'blocked') push(s.auth.blocked, 'error')
        else if (res.error === 'inactive') push(s.auth.inactive, 'error')
        else push(s.auth.invalidCreds, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(s.notifications.loginOk, 'success')
      navigate('/app/order', { replace: true })
    },
    onError: () => push(strings().common.error, 'error'),
  })

  const googleMut = useMutation({
    mutationFn: googleLogin,
    onSuccess: async () => {
      const s = strings()
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(s.notifications.loginOk, 'success')
      navigate('/app/order', { replace: true })
    },
  })
  const googleOnce = useRef(false)

  useEffect(() => {
    if (sp.get('google') === '1' && !googleOnce.current) {
      googleOnce.current = true
      googleMut.mutate()
    }
  }, [sp, googleMut])

  return (
    <AuthScreenLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-lg"
      >
        <AuthCard title={t.auth.loginTitle}>
          <form className="space-y-4" onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="idf">{t.auth.loginIdentifierLabel}</Label>
              <Input id="idf" {...form.register('identifier')} autoComplete="username" />
              {form.formState.errors.identifier?.message ? (
                <p className="text-xs text-brand-danger">{form.formState.errors.identifier.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="pw">{t.auth.password}</Label>
              <Input id="pw" type="password" {...form.register('password')} autoComplete="current-password" />
              {form.formState.errors.password?.message ? (
                <p className="text-xs text-brand-danger">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={mut.isPending || googleMut.isPending}>
              {mut.isPending ? t.common.loading : t.welcome.login}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full border border-white/10 bg-white/95 text-brand-navy hover:bg-white"
              disabled={googleMut.isPending}
              onClick={() => googleMut.mutate()}
            >
              <GoogleGIcon className="h-4 w-4" />
              {t.auth.googleSim}
            </Button>
            <p className="text-center text-sm text-stone-400">
              {t.auth.noAccountPrompt}{' '}
              <Link className="font-semibold text-teal-400 hover:text-teal-300 hover:underline" to="/register">
                {t.welcome.register}
              </Link>
            </p>
            <p className="text-center text-xs text-stone-500">{t.auth.demoAccountHint}</p>
          </form>
        </AuthCard>
      </motion.div>
    </AuthScreenLayout>
  )
}
