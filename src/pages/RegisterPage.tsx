import type { ReactNode } from 'react'
import { useMemo } from 'react'
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
import { AuthCard } from '../components/auth/AuthCard'
import { AuthScreenLayout } from '../components/auth/AuthScreenLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function RegisterPage() {
  const t = strings()
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
        className="mx-auto w-full max-w-lg"
      >
        <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((v) =>
              mut.mutate({
                firstName: v.firstName,
                lastName: v.lastName,
                email: v.email,
                phone: v.phone,
                password: v.password,
              })
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.auth.firstName} error={form.formState.errors.firstName?.message}>
                <Input {...form.register('firstName')} autoComplete="given-name" />
              </Field>
              <Field label={t.auth.lastName} error={form.formState.errors.lastName?.message}>
                <Input {...form.register('lastName')} autoComplete="family-name" />
              </Field>
            </div>
            <Field label={t.auth.email} error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register('email')} autoComplete="email" />
            </Field>
            <Field label={t.auth.phone} error={form.formState.errors.phone?.message}>
              <Input {...form.register('phone')} autoComplete="tel" placeholder="+38761111222" />
            </Field>
            <Field label={t.auth.password} error={form.formState.errors.password?.message}>
              <Input type="password" {...form.register('password')} autoComplete="new-password" />
            </Field>
            <Field label={t.auth.confirmPassword} error={form.formState.errors.confirmPassword?.message}>
              <Input type="password" {...form.register('confirmPassword')} autoComplete="new-password" />
            </Field>
            <Button type="submit" className="w-full" disabled={mut.isPending}>
              {mut.isPending ? t.common.loading : t.auth.continue}
            </Button>
            <p className="text-center text-sm text-stone-400">
              {t.auth.haveAccountPrompt}{' '}
              <Link className="font-semibold text-teal-400 hover:text-teal-300 hover:underline" to="/login">
                {t.welcome.login}
              </Link>
            </p>
          </form>
        </AuthCard>
      </motion.div>
    </AuthScreenLayout>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 text-left">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-brand-danger">{error}</p> : null}
    </div>
  )
}
