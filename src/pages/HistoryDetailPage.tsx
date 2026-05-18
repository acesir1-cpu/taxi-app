import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { ComplaintCategory, ComplaintStatus } from '../types/domain'
import { formatBsDateTime } from '../utils/date'
import { getComplaintsForPassenger } from '../services/problemApi'
import { getDriverById, getRatingForRide, getRideById, getVehicleById, repeatRide } from '../services/rideApi'
import { RideStatusBadge } from '../components/common/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { LoadingState } from '../components/common/LoadingState'
import { PassengerInvoiceLink } from '../components/passenger/PassengerInvoiceLink'

export function HistoryDetailPage() {
  const t = strings()
  const { id } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()

  const rideQ = useQuery({
    queryKey: ['ride', id],
    queryFn: () => getRideById(id!),
    enabled: !!id,
  })
  const ratingQ = useQuery({
    queryKey: ['rating', id],
    queryFn: () => getRatingForRide(id!),
    enabled: !!id,
  })
  const complaintsQ = useQuery({
    queryKey: ['complaints', me.account.id],
    queryFn: () => getComplaintsForPassenger(me.account.id),
  })
  const driverQ = useQuery({
    queryKey: ['driver', rideQ.data?.driverId],
    queryFn: () => getDriverById(rideQ.data!.driverId),
    enabled: !!rideQ.data?.driverId,
  })
  const vehicleQ = useQuery({
    queryKey: ['vehicle', rideQ.data?.vehicleId],
    queryFn: () => getVehicleById(rideQ.data!.vehicleId),
    enabled: !!rideQ.data?.vehicleId,
  })

  if (rideQ.isLoading) return <LoadingState />
  const ride = rideQ.data
  if (!ride || ride.passengerId !== me.profile.id) {
    return <p className="text-sm text-slate-600">{t.history.rideNotFound}</p>
  }

  const rideDetail = ride
  const complaint = complaintsQ.data?.find((c) => c.rideId === rideDetail.id)
  const driver = driverQ.data
  const vehicle = vehicleQ.data

  async function onRepeat() {
    const res = await repeatRide(rideDetail.id, me.account.id)
    if ('error' in res) return
    navigate('/app/order', { state: { pickup: res.pickup, destination: res.destination } })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" asChild>
          <Link to="/app/history">{t.common.back}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t.history.detailTitle}</CardTitle>
          <RideStatusBadge status={rideDetail.status} />
          <p className="w-full text-xs text-slate-500">
            {t.common.back}: {t.history.title}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-semibold text-brand-navy">
            {rideDetail.pickup.label} → {rideDetail.destination.label}
          </p>
          <p className="text-slate-600">
            {t.history.detailCreated} {formatBsDateTime(rideDetail.createdAt)}
          </p>
          {rideDetail.startedAt ? (
            <p className="text-slate-600">
              {t.history.detailStarted} {formatBsDateTime(rideDetail.startedAt)}
            </p>
          ) : null}
          {rideDetail.finishedAt ? (
            <p className="text-slate-600">
              {t.history.detailFinished} {formatBsDateTime(rideDetail.finishedAt)}
            </p>
          ) : null}
          {rideDetail.cancelledAt ? (
            <p className="text-slate-600">
              {t.history.detailCancelled} {formatBsDateTime(rideDetail.cancelledAt)}
            </p>
          ) : null}
          <p className="text-sm">
            {t.history.detailPrice}{' '}
            <strong className="inline-block text-sm font-bold tabular-nums whitespace-nowrap">
              {(rideDetail.finalPrice ?? rideDetail.estimatedPrice).toFixed(2)} BAM
            </strong>
          </p>
          <p>
            {t.history.detailPayment} <strong>{t.order.cash}</strong>
          </p>
          <p className="text-slate-600">
            {t.history.orderTypeLabel}:{' '}
            <strong>{rideDetail.orderType === 'zakazano' ? t.order.schedule : t.history.orderImmediate}</strong>
            {rideDetail.orderType === 'zakazano' && rideDetail.scheduledAt ? (
              <>
                {' '}
                · {t.history.orderScheduledDetail}: {formatBsDateTime(rideDetail.scheduledAt)}
              </>
            ) : null}
          </p>
          {driver ? (
            <p>
              {t.history.detailDriver}{' '}
              <strong>
                {driver.firstName} {driver.lastName}
              </strong>{' '}
              (⭐ {driver.rating.toFixed(1)})
            </p>
          ) : null}
          {vehicle ? (
            <p>
              {t.history.detailVehicle}{' '}
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>{' '}
              · {vehicle.registration} · {vehicle.color}
            </p>
          ) : null}
          {ratingQ.data ? (
            <p>
              {t.history.detailRating} <strong>{ratingQ.data.stars}/5</strong>
              {ratingQ.data.comment ? ` — ${ratingQ.data.comment}` : ''}
            </p>
          ) : null}
          {complaint ? (
            <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
              {t.history.complaintNotice}{' '}
              <strong>{t.problem.categories[complaint.category as ComplaintCategory]}</strong> — {t.history.complaintStatusLabel}{' '}
              {t.history.complaintStatuses[complaint.status as ComplaintStatus]}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            {rideDetail.status === 'zavrsena' ? (
              <PassengerInvoiceLink rideId={rideDetail.id} />
            ) : (
              <Button variant="outline" asChild>
                <Link to={`/app/documents/ride_confirmation/${rideDetail.id}`}>{t.history.viewRideConfirmation}</Link>
              </Button>
            )}
            <Button type="button" onClick={onRepeat}>
              {t.history.repeat}
            </Button>
            {rideDetail.status === 'zavrsena' && !ratingQ.data ? (
              <Button asChild>
                <Link to={`/app/rate/${rideDetail.id}`}>{t.history.rate}</Link>
              </Button>
            ) : null}
            {complaint ? (
              <Button variant="secondary" disabled>
                {t.history.complaintProcessing}
              </Button>
            ) : (
              <Button variant="secondary" asChild>
                <Link to={`/app/problem/${rideDetail.id}`}>{t.history.problem}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
