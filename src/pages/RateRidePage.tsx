import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { PassengerInvoiceLink } from '../components/passenger/PassengerInvoiceLink'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import { getDriverById, getRatingForRide, getRideById, rateRide } from '../services/rideApi'
import { useToastStore } from '../store/notificationStore'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { useLangRefresh } from '../hooks/useLangRefresh'

function RideCompletedInvoiceCard({ rideId, priceBam }: { rideId: string; priceBam: number }) {
  const t = strings()
  return (
    <Card className="border-brand-teal/25 bg-brand-teal/5">
      <CardContent className="space-y-3 pt-5">
        <motion.div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-teal">{t.rating.rideCompleted}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-navy">{priceBam.toFixed(2)} BAM</p>
          <p className="mt-1 text-sm text-slate-600">{t.documents.invoiceHint}</p>
        </motion.div>
        <PassengerInvoiceLink rideId={rideId} className="w-full" size="lg" />
      </CardContent>
    </Card>
  )
}

export function RateRidePage() {
  useLangRefresh()
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
        await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
        navigate('/app/history', { replace: true })
        return
      }
      push(strings().notifications.ratingSaved, 'success')
      await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['rating', rideId] })
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
      navigate('/app/history', { replace: true })
    },
  })

  async function onSkipRating() {
    await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
    await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
    navigate('/app/history', { replace: true })
  }

  const ride = rideQuery.data
  const driver = driverQuery.data
  const ridePrice = ride ? (ride.finalPrice ?? ride.estimatedPrice) : 0
  const canInvoice = ride?.status === 'zavrsena' && !!rideId

  if (existing.data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg space-y-4"
      >
        {canInvoice ? <RideCompletedInvoiceCard rideId={rideId!} priceBam={ridePrice} /> : null}
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-slate-600">{t.rating.already}</p>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/app/history', { replace: true })}>
              {t.history.title}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg space-y-4 max-md:flex max-md:min-h-[72vh] max-md:flex-col max-md:items-center max-md:justify-center"
    >
      {canInvoice ? <RideCompletedInvoiceCard rideId={rideId!} priceBam={ridePrice} /> : null}
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
          <Button variant="secondary" className="w-full" size="lg" onClick={onSkipRating}>
            {t.rating.skip}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
