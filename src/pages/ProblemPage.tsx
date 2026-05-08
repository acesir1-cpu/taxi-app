import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { strings } from '../i18n/strings'
import { getGuestLang } from '../i18n/guestLocale'
import type { AppOutletContext } from '../types/appContext'
import type { ComplaintCategory } from '../types/domain'
import { createComplaint } from '../services/problemApi'
import { getRideById } from '../services/rideApi'
import { useToastStore } from '../store/notificationStore'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

const categoryEnum = z.enum([
  'kasnjenje',
  'neprofesionalno_ponasanje',
  'pogresna_ruta',
  'problem_s_vozilom',
  'naplata',
  'drugo',
])

type Form = z.infer<ReturnType<typeof buildSchema>>

function buildSchema(descriptionMin: string) {
  return z.object({
    category: categoryEnum,
    description: z.string().min(5, descriptionMin),
  })
}

export function ProblemPage() {
  const t = strings()
  const schema = useMemo(() => buildSchema(t.problem.descriptionMin), [t])
  const categories: { id: ComplaintCategory; label: string }[] = useMemo(
    () => [
      { id: 'kasnjenje', label: t.problem.categories.kasnjenje },
      { id: 'neprofesionalno_ponasanje', label: t.problem.categories.neprofesionalno_ponasanje },
      { id: 'pogresna_ruta', label: t.problem.categories.pogresna_ruta },
      { id: 'problem_s_vozilom', label: t.problem.categories.problem_s_vozilom },
      { id: 'naplata', label: t.problem.categories.naplata },
      { id: 'drugo', label: t.problem.categories.drugo },
    ],
    [t],
  )

  const { rideId } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)

  const rideQ = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => getRideById(rideId!),
    enabled: !!rideId,
  })
  const ride = rideQ.data
  const isActiveRide =
    ride != null && ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku'].includes(ride.status)
  const backTarget = rideId ? (isActiveRide ? `/app/ride/${rideId}` : `/app/history/${rideId}`) : '/app/history'

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'drugo', description: '' },
  })

  const mut = useMutation({
    mutationFn: (v: Form) => createComplaint(rideId!, me.account.id, v.category, v.description),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error === 'duplicate' ? strings().problem.duplicateComplaint : strings().common.error, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['complaints', me.account.id] })
      push(strings().problem.sent, 'success')
      navigate(backTarget, { replace: true })
    },
  })

  if (!ride) {
    return <p className="text-sm text-slate-600">{t.history.rideNotFound}</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.problem.title}</CardTitle>
        <p className="text-xs text-slate-500">
          {t.common.back}: {isActiveRide ? t.nav.activeRide : t.nav.history}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
          <div className="space-y-1.5">
            <Label>{t.problem.category}</Label>
            <select
              className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              {...form.register('category')}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d">{t.problem.description}</Label>
            <Textarea id="d" rows={5} {...form.register('description')} />
            <p className="text-xs text-slate-500">
              {getGuestLang() === 'en'
                ? 'Include what happened, when it happened, and how we can reproduce it.'
                : 'Navedite šta se desilo, kada se desilo i kako možemo ponoviti problem.'}
            </p>
            {form.formState.errors.description?.message ? (
              <p className="text-xs text-brand-danger">{form.formState.errors.description.message}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={mut.isPending}>
              {t.problem.submit}
            </Button>
            <Button variant="secondary" type="button" asChild>
              <Link to={backTarget}>{t.common.back}</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
