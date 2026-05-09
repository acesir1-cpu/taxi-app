import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { strings } from '../i18n/strings'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { buildRegisterSchema, type RegisterFormValues } from '../schemas/auth'
import { register } from '../services/authApi'
import { setPendingVerifyAccountId } from '../utils/storage'
import { useToastStore } from '../store/notificationStore'
import {
  AuthInput,
  Field,
  PrimaryButton,
  RoleToggle,
} from '../components/auth/authPrimitives'
import { cn } from '../lib/utils'

type AuthMode = 'passenger' | 'driver'

export function RegisterPage() {
  useLangRefresh()
  const t = strings()
  const [mode, setMode] = useState<AuthMode>('passenger')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const registerSchema = useMemo(() => buildRegisterSchema(t), [t])
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const mut = useMutation({
    mutationFn: register,
    onSuccess: async (res) => {
      const s = strings()
      if ('error' in res) {
        push(res.error === 'exists' ? s.auth.exists : s.common.error, 'error')
        return
      }
      setPendingVerifyAccountId(res.accountId)
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(s.auth.codeSent, 'success')
      navigate('/verify', { replace: true })
    },
    onError: () => push(strings().common.error, 'error'),
  })

  function onSubmit(v: RegisterFormValues) {
    if (mode === 'driver') {
      // Driver self-signup is not supported by the current auth API; route to support.
      push(t.auth.driverRegisterDisabled, 'info')
      return
    }
    if (!acceptedTerms) {
      push(t.auth.acceptTermsError, 'error')
      return
    }
    mut.mutate({
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      password: v.password,
    })
  }

  const errors = form.formState.errors

  return (
    <>
      <h1 className="auth-marketing-page-title font-bold tracking-tight text-[#111827]">
        {t.auth.registerTitle}
      </h1>
      <p className="auth-marketing-page-subtitle mt-1 text-[14px] text-[#6B7280] md:mt-0 md:text-[13px]">
        {t.auth.registerSubtitle}
      </p>

      <RoleToggle
        mode={mode}
        onChange={setMode}
        passengerLabel={t.auth.passengerMode}
        driverLabel={t.auth.driverMode}
      />

      <form className="mt-4 flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Row 1: Ime / Prezime */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.auth.firstName} htmlFor="reg-firstName" error={errors.firstName?.message}>
            <AuthInput
              id="reg-firstName"
              {...form.register('firstName')}
              autoComplete="given-name"
              placeholder={t.auth.firstNamePlaceholder}
            />
          </Field>
          <Field label={t.auth.lastName} htmlFor="reg-lastName" error={errors.lastName?.message}>
            <AuthInput
              id="reg-lastName"
              {...form.register('lastName')}
              autoComplete="family-name"
              placeholder={t.auth.lastNamePlaceholder}
            />
          </Field>
        </div>

        {/* Row 2: Email */}
        <Field label={t.auth.email} htmlFor="reg-email" error={errors.email?.message}>
          <AuthInput
            id="reg-email"
            type="email"
            {...form.register('email')}
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
          />
        </Field>

        {/* Row 3: Phone — jedan okvir kao ostala polja; +387 je samo prefiks */}
        <Field label={t.auth.phone} htmlFor="reg-phone" error={errors.phone?.message}>
          <PhoneInput
            placeholder={t.auth.phonePlaceholder}
            register={form.register('phone')}
          />
        </Field>

        {/* Row 4: Lozinka / Potvrda lozinke */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.auth.password} htmlFor="reg-pwd" error={errors.password?.message}>
            <PasswordInput
              id="reg-pwd"
              {...form.register('password')}
              autoComplete="new-password"
              placeholder={t.auth.passwordPlaceholder}
              show={showPwd}
              onToggleShow={() => setShowPwd((v) => !v)}
            />
          </Field>
          <Field
            label={t.auth.confirmPassword}
            htmlFor="reg-cpwd"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="reg-cpwd"
              {...form.register('confirmPassword')}
              autoComplete="new-password"
              placeholder={t.auth.confirmPasswordPlaceholder}
              show={showConfirm}
              onToggleShow={() => setShowConfirm((v) => !v)}
            />
          </Field>
        </div>

        {/* Custom checkbox */}
        <TermsCheckbox
          checked={acceptedTerms}
          onChange={setAcceptedTerms}
          prefix={t.auth.acceptTermsPrefix}
          termsLink={t.auth.termsLink}
          privacyLink={t.auth.privacyLink}
          andWord={t.auth.andWord}
        />

        <PrimaryButton type="submit" disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
          <span>{mut.isPending ? t.common.loading : t.auth.registerCta}</span>
        </PrimaryButton>

        <p className="text-center" style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {t.auth.haveAccountPrompt}{' '}
          <Link to="/login" className="font-semibold hover:underline" style={{ color: '#F5A623' }}>
            {t.auth.signInCta}
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
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})

function PhoneInput({
  placeholder,
  register,
}: {
  placeholder: string
  register: UseFormRegisterReturn
}) {
  const { onBlur: regOnBlur, ...regRest } = register
  return (
    <div className="phone-input-wrapper w-full">
      <span className="phone-prefix shrink-0 select-none" aria-hidden="true">
        +387
      </span>
      <input
        {...regRest}
        id="reg-phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder}
        className="phone-field-input outline-none"
        onBlur={regOnBlur}
      />
    </div>
  )
}

function TermsCheckbox({
  checked,
  onChange,
  prefix,
  termsLink,
  privacyLink,
  andWord,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  prefix: string
  termsLink: string
  privacyLink: string
  andWord: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3" style={{ marginTop: 4 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center transition-colors',
        )}
        style={{
          borderRadius: 4,
          border: `1.5px solid ${checked ? '#F5A623' : '#E5E7EB'}`,
          background: checked ? '#F5A623' : '#FFFFFF',
        }}
      >
        {checked ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
      </span>
      <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
        {prefix}{' '}
        <Link className="font-medium hover:underline" style={{ color: '#F5A623' }} to="/terms">
          {termsLink}
        </Link>{' '}
        {andWord}{' '}
        <Link className="font-medium hover:underline" style={{ color: '#F5A623' }} to="/privacy">
          {privacyLink}
        </Link>
      </span>
    </label>
  )
}
