import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Ride } from '../types/domain'
import { formatBsDate } from '../utils/date'
import { getComplaintsForPassenger } from '../services/problemApi'
import { getRatingForRide, getRideHistory, repeatRide } from '../services/rideApi'
import { RideStatusBadge } from '../components/common/StatusBadge'
import { EmptyState } from '../components/common/EmptyState'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

type Filter = 'all' | 'zavrsena' | 'otkazana' | 'zakazano' | 'problem'
const RIDES_PER_PAGE = 4

export function HistoryPage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['history', me.profile.id],
    queryFn: () => getRideHistory(me.profile.id),
  })
  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints', me.account.id],
    queryFn: () => getComplaintsForPassenger(me.account.id),
  })

  const filtered = useMemo(() => {
    return rides.filter((r) => {
      if (filter === 'all') return true
      if (filter === 'zavrsena') return r.status === 'zavrsena'
      if (filter === 'otkazana') return r.status === 'otkazana'
      if (filter === 'zakazano') return r.orderType === 'zakazano'
      if (filter === 'problem') return complaints.some((c) => c.rideId === r.id)
      return true
    })
  }, [complaints, filter, rides])

  const totalPages = Math.max(1, Math.ceil(filtered.length / RIDES_PER_PAGE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * RIDES_PER_PAGE
    return filtered.slice(start, start + RIDES_PER_PAGE)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [filter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  async function onRepeat(ride: Ride) {
    const res = await repeatRide(ride.id, me.account.id)
    if ('error' in res) return
    navigate('/app/order', { state: { pickup: res.pickup, destination: res.destination } })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-navy">{t.history.title}</h1>
      <div className="flex flex-wrap gap-2">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label={t.history.filterAll} />
        <FilterBtn active={filter === 'zavrsena'} onClick={() => setFilter('zavrsena')} label={t.history.filterDone} />
        <FilterBtn active={filter === 'otkazana'} onClick={() => setFilter('otkazana')} label={t.history.filterCancelled} />
        <FilterBtn active={filter === 'zakazano'} onClick={() => setFilter('zakazano')} label={t.history.filterScheduled} />
        <FilterBtn active={filter === 'problem'} onClick={() => setFilter('problem')} label={t.history.filterProblem} />
      </div>
      {isLoading ? <p className="text-sm text-slate-500">{t.common.loading}</p> : null}
      {!isLoading && filtered.length === 0 ? (
        <EmptyState title={t.history.empty} />
      ) : (
        <>
          <ul className="space-y-4">
            {pageItems.map((r) => (
              <motion.li layout key={r.id}>
                <RideHistoryCard ride={r} onRepeat={() => onRepeat(r)} accountId={me.account.id} />
              </motion.li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-xl border border-brand-border/80 bg-white/80 px-3 py-2">
              <Button
                type="button"
                size="sm"
                variant="outlineThin"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3"
              >
                {t.history.pagePrev}
              </Button>
              <span className="text-xs font-semibold text-slate-600">
                {t.history.pageCounter.replace('{current}', String(page)).replace('{total}', String(totalPages))}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outlineThin"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3"
              >
                {t.history.pageNext}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
        active
          ? 'bg-brand-navy text-white shadow-sm shadow-brand-navy/20'
          : 'bg-white text-slate-700 ring-1 ring-slate-300/90 hover:bg-slate-50 hover:text-brand-navy hover:ring-slate-400'
      )}
    >
      {label}
    </button>
  )
}

function RideHistoryCard({ ride, onRepeat, accountId }: { ride: Ride; onRepeat: () => void; accountId: string }) {
  const t = strings()
  const ratingQ = useQuery({
    queryKey: ['rating', ride.id],
    queryFn: () => getRatingForRide(ride.id),
    enabled: ride.status === 'zavrsena',
  })
  const complaintQ = useQuery({
    queryKey: ['complaints', accountId],
    queryFn: () => getComplaintsForPassenger(accountId),
  })
  const complaint = complaintQ.data?.find((c) => c.rideId === ride.id)
  const canRate = ride.status === 'zavrsena' && !ratingQ.data
  const rated = Boolean(ratingQ.data)

  return (
    <Card className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-card-hover">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <RideStatusBadge status={ride.status} />
            {ride.orderType === 'zakazano' ? (
              <span className="rounded-md border-0 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                {t.order.schedule}
              </span>
            ) : null}
          </div>
          <p className="text-base font-bold leading-snug text-brand-navy">
            {ride.pickup.label} → {ride.destination.label}
          </p>
          <p className="text-sm font-semibold tabular-nums text-slate-800">
            {(ride.finalPrice ?? ride.estimatedPrice).toFixed(2)} BAM
            {ride.paymentMethod === 'gotovina' ? (
              <>
                {' '}
                · <span className="font-medium text-slate-600">{t.order.cash}</span>
              </>
            ) : null}
          </p>
          <p className="text-xs text-slate-500">{formatBsDate(ride.createdAt)}</p>
          {rated ? (
            <p className="text-sm font-medium tabular-nums text-slate-700">
              ⭐ {ratingQ.data!.stars}/5
            </p>
          ) : null}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:min-w-[240px] sm:max-w-md sm:items-stretch">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-3 sm:gap-y-2">
            <Button
              type="button"
              variant="navy"
              size="sm"
              className="w-full min-h-0 px-3.5 py-2 sm:w-auto"
              onClick={onRepeat}
            >
              {t.history.repeat}
            </Button>
            {canRate ? (
              <Button asChild variant="default" size="sm" className="w-full min-h-0 px-3.5 py-2 sm:w-auto">
                <Link to={`/app/rate/${ride.id}`}>{t.history.rate}</Link>
              </Button>
            ) : null}
            <Button asChild variant="outlineThin" size="sm" className="w-full min-h-0 px-3 py-2 sm:w-auto">
              <Link to={`/app/history/${ride.id}`}>{t.history.details}</Link>
            </Button>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            {complaint ? (
              <span className="text-center text-sm font-medium text-orange-800/95 sm:text-right">{t.history.complaintProcessing}</span>
            ) : (
              <Link
                to={`/app/problem/${ride.id}`}
                className="inline-block text-sm font-medium text-slate-500 underline-offset-2 transition-colors hover:text-brand-navy hover:underline active:scale-[0.98] sm:text-right"
              >
                {t.history.problem}
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
