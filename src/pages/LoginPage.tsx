import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import * as React from 'react'
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
import { useLangRefresh } from '../hooks/useLangRefresh'
import { buildLoginSchema, type LoginFormValues } from '../schemas/auth'
import { googleLogin, login } from '../services/authApi'
import { useToastStore } from '../store/notificationStore'
import { GoogleGIcon } from '../components/icons/GoogleGIcon'
import { cn } from '../lib/utils'
import { AuthInput, PrimaryButton, SecondaryButton, RoleToggle, Field, Divider } from '../components/auth/authPrimitives'

type AuthMode = 'passenger' | 'driver'

type DemoAccount = {
  id: AuthMode
  initials: string
  fullName: string
  rolePill: string
  email: string
  password: string
}

export function LoginPage() {
  useLangRefresh()
  const t = strings()
  const [authMode, setAuthMode] = useState<AuthMode>('passenger')
  const [showPwd, setShowPwd] = useState(false)
  const [revealedDemo, setRevealedDemo] = useState<AuthMode | null>(null)
  const loginSchema = useMemo(() => buildLoginSchema(t), [t])
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  })

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

  const googleOnce = useRef(false)
  useEffect(() => {
    if (sp.get('google') === '1' && !googleOnce.current) {
      googleOnce.current = true
      googleMut.mutate()
    }
  }, [sp, googleMut])

  const demoAccounts: DemoAccount[] = [
    {
      id: 'passenger',
      initials: 'LH',
      fullName: 'Lejla Hasanović',
      rolePill: t.auth.passengerMode.toLowerCase(),
      email: DEMO_PASSENGER_EMAIL,
      password: DEMO_PASSENGER_PASSWORD,
    },
    {
      id: 'driver',
      initials: 'AK',
      fullName: 'Amir K.',
      rolePill: t.auth.driverMode.toLowerCase(),
      email: DEMO_DRIVER_EMAIL,
      password: DEMO_DRIVER_PASSWORD,
    },
  ]

  function fillFromDemo(d: DemoAccount) {
    setAuthMode(d.id)
    form.setValue('identifier', d.email, { shouldValidate: true })
    form.setValue('password', d.password, { shouldValidate: true })
  }

  const submitting = mut.isPending || googleMut.isPending

  return (
    <>
      <h1 className="auth-marketing-page-title font-bold tracking-tight text-[#111827]">
        {t.auth.loginTitle}
      </h1>
      <p className="auth-marketing-page-subtitle mt-1 text-[14px] text-[#6B7280] md:mt-0 md:text-[13px]">
        {t.auth.loginSubtitle}
      </p>

      <RoleToggle
        mode={authMode}
        onChange={setAuthMode}
        passengerLabel={t.auth.passengerMode}
        driverLabel={t.auth.driverMode}
      />

      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
      >
        <Field
          label={t.auth.loginIdentifierLabel}
          htmlFor="login-idf"
          error={form.formState.errors.identifier?.message}
        >
          <AuthInput
            id="login-idf"
            {...form.register('identifier')}
            autoComplete="username"
            placeholder={t.auth.loginIdentifierLabel}
          />
        </Field>

        <Field
          label={t.auth.password}
          htmlFor="login-pwd"
          error={form.formState.errors.password?.message}
          right={
            <Link
              to="/reset-password"
              className="font-medium hover:underline"
              style={{ fontSize: 13, color: '#F5A623' }}
            >
              {t.auth.forgotPassword}
            </Link>
          }
        >
          <PasswordInput
            id="login-pwd"
            {...form.register('password')}
            autoComplete="current-password"
            placeholder={t.auth.password}
            show={showPwd}
            onToggleShow={() => setShowPwd((v) => !v)}
          />
        </Field>

        <PrimaryButton type="submit" disabled={submitting}>
          {mut.isPending ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
          <span>{mut.isPending ? t.common.loading : t.welcome.login}</span>
        </PrimaryButton>

        <Divider label={t.welcome.orDivider} />

        <SecondaryButton type="button" disabled={submitting} onClick={() => googleMut.mutate()}>
          {googleMut.isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <GoogleGIcon className="h-[18px] w-[18px]" />
          )}
          <span className="truncate">{t.auth.googleSim}</span>
        </SecondaryButton>

        {!import.meta.env.PROD ? (
          <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3">
            <p
              className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]"
            >
              {t.auth.demoSectionLabel}
            </p>
            <div className="flex flex-col gap-1.5">
              {demoAccounts.map((d) => (
                <DemoRow
                  key={d.id}
                  demo={d}
                  revealed={revealedDemo === d.id}
                  onToggleReveal={() => setRevealedDemo((cur) => (cur === d.id ? null : d.id))}
                  onSelect={() => fillFromDemo(d)}
                  disabled={submitting}
                />
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-center" style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {t.auth.noAccountPrompt}{' '}
          <Link
            to="/register"
            className="font-semibold hover:underline"
            style={{ color: '#F5A623' }}
          >
            {t.welcome.register}
          </Link>
        </p>
      </form>
    </>
  )
}

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { show: boolean; onToggleShow: () => void }
>(function PasswordInput({ show, onToggleShow, ...props }, ref) {
  return (
    <div className="relative">
      <AuthInput
        ref={ref}
        type={show ? 'text' : 'password'}
        {...props}
        style={{ paddingRight: 44, ...props.style }}
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? 'Sakrij lozinku' : 'Prikaži lozinku'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})

function DemoRow({
  demo,
  revealed,
  onToggleReveal,
  onSelect,
  disabled,
}: {
  demo: DemoAccount
  revealed: boolean
  onToggleReveal: () => void
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/80',
      )}
      style={{ minHeight: 40 }}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="flex flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`${demo.fullName} (${demo.rolePill})`}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background: '#F3F4F6',
            color: '#374151',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {demo.initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {demo.fullName}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: '#6B7280',
                background: '#F3F4F6',
                borderRadius: 6,
                padding: '1px 6px',
              }}
            >
              {demo.rolePill}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#9CA3AF' }} className="truncate">
              {demo.email}
            </span>
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {revealed ? demo.password : '••••••••'}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleReveal}
        aria-label={revealed ? 'Sakrij lozinku' : 'Prikaži lozinku'}
        className="rounded-md p-1.5 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
