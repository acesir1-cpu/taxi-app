import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { strings } from '../i18n/strings'
import { buildRegisterSchema, type RegisterFormValues } from '../schemas/auth'
import { register } from '../services/authApi'
import { setPendingVerifyAccountId } from '../utils/storage'
import { useToastStore } from '../store/notificationStore'
import { AuthScreenLayout } from '../components/auth/AuthScreenLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function RegisterPage() {
  const t = strings()
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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

  return (
    <AuthScreenLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-xl"
      >
        <div className="rounded-[1.75rem] border border-white/[0.09] bg-white/[0.07] px-5 py-6 text-stone-100 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:px-7">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="rounded-md bg-brand-yellow px-2 py-1 text-sm font-black leading-none text-stone-900">UF</div>
            <p className="text-2xl font-semibold tracking-tight text-stone-50">{t.brand}</p>
          </div>
          <h1 className="mb-5 text-center text-4xl font-bold tracking-tight text-stone-50">{t.auth.registerTitle}</h1>
          <form
            className="space-y-3.5"
            onSubmit={form.handleSubmit((v) => {
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
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.auth.firstName} error={form.formState.errors.firstName?.message}>
                <Input {...form.register('firstName')} autoComplete="given-name" placeholder={t.auth.firstNamePlaceholder} />
              </Field>
              <Field label={t.auth.lastName} error={form.formState.errors.lastName?.message}>
                <Input {...form.register('lastName')} autoComplete="family-name" placeholder={t.auth.lastNamePlaceholder} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.auth.email} error={form.formState.errors.email?.message}>
                <Input type="email" {...form.register('email')} autoComplete="email" placeholder={t.auth.emailPlaceholder} />
              </Field>
              <Field label={t.auth.phone} error={form.formState.errors.phone?.message}>
                <div className="flex h-11 min-h-[44px] items-center rounded-xl border border-black/[0.14] bg-white px-2 text-sm shadow-sm">
                  <span className="rounded-md bg-slate-100 px-1.5 py-1 text-xs text-brand-navy">+387</span>
                  <span className="px-2 text-slate-400">•</span>
                  <input
                    {...form.register('phone')}
                    autoComplete="tel"
                    placeholder={t.auth.phonePlaceholder}
                    className="h-full w-full bg-transparent text-sm font-medium text-brand-navy placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.auth.password} error={form.formState.errors.password?.message}>
                <Input type="password" {...form.register('password')} autoComplete="new-password" placeholder={t.auth.passwordPlaceholder} />
              </Field>
              <Field label={t.auth.confirmPassword} error={form.formState.errors.confirmPassword?.message}>
                <Input
                  type="password"
                  {...form.register('confirmPassword')}
                  autoComplete="new-password"
                  placeholder={t.auth.confirmPasswordPlaceholder}
                />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border border-white/35 bg-white/10"
              />
              <span>
                {t.auth.acceptTermsPrefix}{' '}
                <Link className="text-teal-300 hover:text-teal-200 hover:underline" to="/terms">
                  {t.auth.termsLink}
                </Link>{' '}
                {t.auth.andWord}{' '}
                <Link className="text-teal-300 hover:text-teal-200 hover:underline" to="/privacy">
                  {t.auth.privacyLink}
                </Link>
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={mut.isPending}>
              {mut.isPending ? t.common.loading : t.auth.registerCta}
            </Button>
            <p className="pt-1 text-center text-sm text-stone-300">
              {t.auth.haveAccountPrompt}{' '}
              <Link className="font-semibold text-teal-300 hover:text-teal-200 hover:underline" to="/login">
                {t.auth.signInCta}
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </AuthScreenLayout>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 text-left">
      <Label className="text-stone-200">{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-brand-danger">{error}</p> : null}
    </div>
  )
}
