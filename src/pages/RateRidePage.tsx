import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import { getDriverById, getRatingForRide, getRideById, rateRide } from '../services/rideApi'
import { useToastStore } from '../store/notificationStore'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'

export function RateRidePage() {
  const t = strings()
  const { rideId } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')

  const rideQuery = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => getRideById(rideId!),
    enabled: !!rideId,
  })
  const existing = useQuery({
    queryKey: ['rating', rideId],
    queryFn: () => getRatingForRide(rideId!),
    enabled: !!rideId,
  })
  const driverQuery = useQuery({
    queryKey: ['driver', rideQuery.data?.driverId],
    queryFn: () => getDriverById(rideQuery.data!.driverId),
    enabled: !!rideQuery.data?.driverId,
  })

  const mut = useMutation({
    mutationFn: () => rateRide(rideId!, me.account.id, me.profile.id, stars, comment),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error === 'already' ? strings().rating.already : strings().common.error, 'error')
        navigate('/app/history', { replace: true })
        return
      }
      push(strings().notifications.ratingSaved, 'success')
      await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['rating', rideId] })
      navigate('/app/history', { replace: true })
    },
  })

  if (existing.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">{t.rating.already}</CardContent>
      </Card>
    )
  }

  const ride = rideQuery.data
  const driver = driverQuery.data

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.rating.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ride ? (
            <p className="text-sm text-slate-600">
              {ride.pickup.label} → {ride.destination.label}
            </p>
          ) : null}
          {driver ? (
            <p className="text-sm font-medium text-brand-navy">
              {driver.firstName} {driver.lastName}
            </p>
          ) : null}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                aria-label={t.rating.starsAria.replace('{n}', String(s))}
                onClick={() => setStars(s)}
              >
                <Star className={`h-9 w-9 ${s <= stars ? 'fill-brand-yellow text-brand-yellow' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-navy" htmlFor="c">
              {t.rating.comment}
            </label>
            <Textarea id="c" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
          </div>
          <Button className="w-full" size="lg" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? t.common.loading : t.rating.submit}
          </Button>
          <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate('/app/history', { replace: true })}>
            {t.rating.skip}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
