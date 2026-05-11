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
import { AuthInput, PrimaryButton, SecondaryButton, RoleToggle, Field, Divider } from '../components/auth/authPrimitives'

type AuthMode = 'passenger' | 'driver'

function demoLoginValues(mode: AuthMode): LoginFormValues {
  return mode === 'passenger'
    ? { identifier: DEMO_PASSENGER_EMAIL, password: DEMO_PASSENGER_PASSWORD }
    : { identifier: DEMO_DRIVER_EMAIL, password: DEMO_DRIVER_PASSWORD }
}

export function LoginPage() {
  useLangRefresh()
  const t = strings()
  const loginSchema = useMemo(() => buildLoginSchema(t), [t])
  const [authMode, setAuthMode] = useState<AuthMode>('passenger')
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: demoLoginValues('passenger'),
  })

  useEffect(() => {
    form.reset(demoLoginValues(authMode))
  }, [authMode, form])

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
