import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DEMO_DRIVER_EMAIL,
  DEMO_DRIVER_PASSWORD,
  DEMO_PASSENGER_EMAIL,
  DEMO_PASSENGER_PASSWORD,
} from '../data/seed'
import { strings } from '../i18n/strings'
import { buildLoginSchema, type LoginFormValues } from '../schemas/auth'
import { driverDemoLogin, googleLogin, login } from '../services/authApi'
import { useToastStore } from '../store/notificationStore'
import { AuthCard } from '../components/auth/AuthCard'
import { AuthScreenLayout } from '../components/auth/AuthScreenLayout'
import { GoogleGIcon } from '../components/icons/GoogleGIcon'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function LoginPage() {
  const t = strings()
  const pwdWord = t.auth.password.toLowerCase()
  const [authMode, setAuthMode] = useState<'passenger' | 'driver'>('passenger')
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
      await qc.invalidateQueries({ queryKey: ['driverUi'] })
      push(s.notifications.loginOk, 'success')
      navigate(res.role === 'vozac' ? '/driver' : '/app/order', { replace: true })
    },
    onError: () => push(strings().common.error, 'error'),
  })

  const googleMut = useMutation({
    mutationFn: googleLogin,
    onSuccess: async (res) => {
      const s = strings()
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['driverUi'] })
      push(s.notifications.loginOk, 'success')
      navigate(res.role === 'vozac' ? '/driver' : '/app/order', { replace: true })
    },
  })

  const driverDemoMut = useMutation({
    mutationFn: driverDemoLogin,
    onSuccess: async (res) => {
      if ('error' in res) {
        push(strings().auth.demoDriverUnavailable, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['driverUi', res.accountId] })
      push(strings().notifications.loginOk, 'success')
      navigate('/driver', { replace: true })
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
        <AuthCard title={t.brand}>
          <form className="space-y-3" onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/20 bg-white/[0.05] p-1">
              <button
                type="button"
                onClick={() => setAuthMode('passenger')}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  authMode === 'passenger' ? 'bg-white/15 text-white' : 'text-stone-300 hover:text-white'
                }`}
              >
                {t.auth.passengerMode}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('driver')}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  authMode === 'driver' ? 'bg-white/15 text-white' : 'text-stone-300 hover:text-white'
                }`}
              >
                {t.auth.driverMode}
              </button>
            </div>
            <div className="space-y-1.5 text-left">
              <p className="text-sm text-stone-300">{t.auth.loginIdentifierLabel}</p>
              <Input
                id="idf"
                aria-label={t.auth.loginIdentifierLabel}
                {...form.register('identifier')}
                autoComplete="username"
                placeholder={t.auth.loginIdentifierLabel}
              />
              {form.formState.errors.identifier?.message ? (
                <p className="text-xs text-brand-danger">{form.formState.errors.identifier.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-stone-300">{t.auth.password}</p>
                <Link to="/reset-password" className="text-xs font-medium text-teal-300 hover:text-teal-200 hover:underline">
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <Input
                id="pw"
                type="password"
                aria-label={t.auth.password}
                {...form.register('password')}
                autoComplete="current-password"
                placeholder={t.auth.password}
              />
              {form.formState.errors.password?.message ? (
                <p className="text-xs text-brand-danger">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={mut.isPending || googleMut.isPending || driverDemoMut.isPending}>
              {mut.isPending ? t.common.loading : t.welcome.login}
            </Button>
            <div className="space-y-2">
              <p className="text-sm text-stone-300">{t.auth.demoPassengerTitle}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/[0.06] p-2 text-left transition hover:bg-white/[0.12]"
                  disabled={mut.isPending || googleMut.isPending || driverDemoMut.isPending}
                  onClick={() => {
                    setAuthMode('passenger')
                    form.setValue('identifier', DEMO_PASSENGER_EMAIL, { shouldValidate: true })
                    form.setValue('password', DEMO_PASSENGER_PASSWORD, { shouldValidate: true })
                  }}
                >
                  <p className="text-sm font-semibold text-stone-100">{t.auth.demoPassengerSubtitle}</p>
                  <p className="mt-0.5 text-[11px] text-stone-400">{DEMO_PASSENGER_EMAIL}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {pwdWord}: {DEMO_PASSENGER_PASSWORD}
                  </p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/[0.06] p-2 text-left transition hover:bg-white/[0.12]"
                  disabled={mut.isPending || googleMut.isPending || driverDemoMut.isPending}
                  onClick={() => {
                    setAuthMode('driver')
                    driverDemoMut.mutate()
                  }}
                >
                  <p className="text-sm font-semibold text-stone-100">{t.auth.demoDriverSubtitle}</p>
                  <p className="mt-0.5 text-[11px] text-stone-400">{DEMO_DRIVER_EMAIL}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {pwdWord}: {DEMO_DRIVER_PASSWORD}
                  </p>
                </button>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full border-2 border-white/30 bg-white/[0.05] text-stone-100 hover:bg-white/[0.12] hover:text-white"
              disabled={googleMut.isPending || driverDemoMut.isPending}
              onClick={() => googleMut.mutate()}
            >
              <GoogleGIcon className="h-4 w-4" />
              {t.auth.googleSim}
            </Button>
            <p className="text-center text-sm text-stone-300">
              {t.auth.noAccountPrompt}{' '}
              <Link to="/register" className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                {t.welcome.register}
              </Link>
            </p>
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
          </form>
        </AuthCard>
      </motion.div>
    </AuthScreenLayout>
  )
}
