import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import { logout, updateProfile } from '../services/authApi'
import { useToastStore } from '../store/notificationStore'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'

export function ProfilePage() {
  const t = strings()
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t.auth.validation.invalidEmail),
        phone: z.string().min(8, t.auth.validation.invalidPhone),
      }),
    [t],
  )
  type Form = z.infer<typeof schema>
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: me.account.email, phone: me.account.phone },
  })

  const save = useMutation({
    mutationFn: (v: Form) => updateProfile(me.account.id, v),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(strings().common.error, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(strings().profile.saveSuccess, 'success')
    },
  })

  const out = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate('/welcome', { replace: true })
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-navy">{t.profile.title}</h1>
      <Card className="mx-auto max-w-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <CardHeader className="p-7 pb-0 sm:p-8 sm:pb-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle className="text-2xl font-bold sm:text-[1.7rem]">
              {me.profile.firstName} {me.profile.lastName}
            </CardTitle>
            <Badge
              className={cn(
                'rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold',
                me.account.status === 'aktivan'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              )}
            >
              {t.profile.status}:{' '}
              {t.profile.accountStatus[me.account.status as keyof typeof t.profile.accountStatus] ?? me.account.status}
            </Badge>
          </div>
          <p className="pt-3 text-sm text-slate-600">{t.profile.editHint}</p>
        </CardHeader>
        <CardContent className="space-y-7 p-7 pt-7 sm:space-y-8 sm:p-8">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.profile.contactSection}</h2>
            <form className="max-w-xl space-y-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <div className="space-y-1.5">
                <Label htmlFor="em">{t.auth.email}</Label>
                <Input id="em" className="border-black/[0.16] focus-visible:border-brand-yellow" {...form.register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph">{t.auth.phone}</Label>
                <Input id="ph" className="border-black/[0.16] focus-visible:border-brand-yellow" {...form.register('phone')} />
              </div>
              <Button
                type="submit"
                disabled={save.isPending}
                className="h-11 px-6 shadow-[0_8px_20px_rgba(255,196,0,0.28)] hover:-translate-y-px hover:brightness-[1.03]"
              >
                {save.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.common.loading}
                  </>
                ) : (
                  t.profile.save
                )}
              </Button>
            </form>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.profile.secondaryActions}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/app/privacy"
                className="text-sm font-medium text-slate-600 underline-offset-2 transition-colors hover:text-brand-navy hover:underline"
              >
                {t.profile.privacy}
              </Link>
              <Button size="sm" variant="danger" type="button" onClick={() => out.mutate()}>
                {t.auth.logout}
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
