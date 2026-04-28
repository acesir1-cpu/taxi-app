import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Ride } from '../types/domain'
import { formatBsDate } from '../utils/date'
import { getComplaintsForPassenger } from '../services/problemApi'
import { deleteRideFromHistory, getRatingForRide, getRideHistory, purgePassengerHistory, repeatRide } from '../services/rideApi'
import { clearHistoryInApp, getHistoryPrivacyPrefs } from '../lib/historyPrivacy'
import { RideStatusBadge } from '../components/common/StatusBadge'
import { EmptyState } from '../components/common/EmptyState'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { useToastStore } from '../store/notificationStore'

type Filter = 'all' | 'zavrsena' | 'otkazana' | 'zakazano' | 'problem'
const RIDES_PER_PAGE = 4

export function HistoryPage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false)
  const [clearAllStep, setClearAllStep] = useState<1 | 2>(1)
  const historyPrefs = getHistoryPrivacyPrefs(me.account.id)
  const [hideHistoryInApp] = useState(() => historyPrefs.hideHistoryInApp)
  const historySaveDisabled = !historyPrefs.saveHistory

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['history', me.profile.id],
    queryFn: () => getRideHistory(me.profile.id),
  })
  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints', me.account.id],
    queryFn: () => getComplaintsForPassenger(me.account.id),
  })
  const historyHidden = hideHistoryInApp && rides.length === 0
  const deleteRideMut = useMutation({
    mutationFn: (rideId: string) => deleteRideFromHistory(rideId, me.account.id, me.profile.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['complaints', me.account.id] })
    },
  })
  const clearAllMut = useMutation({
    mutationFn: () => purgePassengerHistory(me.account.id, me.profile.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['complaints', me.account.id] })
    },
  })

  const filtered = useMemo(() => {
    if (historyHidden || historySaveDisabled) return []
    return rides.filter((r) => {
      if (filter === 'all') return true
      if (filter === 'zavrsena') return r.status === 'zavrsena'
      if (filter === 'otkazana') return r.status === 'otkazana'
      if (filter === 'zakazano') return r.orderType === 'zakazano'
      if (filter === 'problem') return complaints.some((c) => c.rideId === r.id)
      return true
    })
  }, [complaints, filter, rides, historyHidden, historySaveDisabled])

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
      {!historySaveDisabled && rides.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={clearAllMut.isPending}
            onClick={() => {
              setClearAllStep(1)
              setClearAllModalOpen(true)
            }}
          >
            {t.history.clearAllCta}
          </Button>
        </div>
      ) : null}
      {historySaveDisabled ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-semibold text-amber-900">{t.history.disabledTitle}</p>
            <p className="text-xs text-amber-900/90">{t.history.disabledHint}</p>
            <Button type="button" variant="secondary" onClick={() => navigate('/app/profile')}>
              {t.history.openSettings}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {historyHidden ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-slate-700">{t.history.hiddenTitle}</p>
            <p className="text-xs text-slate-600">{t.history.hiddenHint}</p>
          </CardContent>
        </Card>
      ) : null}
      {!historySaveDisabled ? (
        <div className="flex flex-wrap gap-2">
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label={t.history.filterAll} />
          <FilterBtn active={filter === 'zavrsena'} onClick={() => setFilter('zavrsena')} label={t.history.filterDone} />
          <FilterBtn active={filter === 'otkazana'} onClick={() => setFilter('otkazana')} label={t.history.filterCancelled} />
          <FilterBtn active={filter === 'zakazano'} onClick={() => setFilter('zakazano')} label={t.history.filterScheduled} />
          <FilterBtn active={filter === 'problem'} onClick={() => setFilter('problem')} label={t.history.filterProblem} />
        </div>
      ) : null}
      {isLoading ? <p className="text-sm text-slate-500">{t.common.loading}</p> : null}
      {!historySaveDisabled ? (
        !isLoading && filtered.length === 0 ? (
          <EmptyState title={t.history.empty} />
        ) : (
          <>
            <ul className="space-y-4">
              {pageItems.map((r) => (
                <motion.li layout key={r.id}>
                  <RideHistoryCard
                    ride={r}
                    onRepeat={() => onRepeat(r)}
                    accountId={me.account.id}
                    deleting={deleteRideMut.isPending}
                    onDelete={async () => {
                      const ok = window.confirm(t.history.deleteRideConfirm)
                      if (!ok) return
                      await deleteRideMut.mutateAsync(r.id)
                    }}
                  />
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
        )
      ) : null}
      <ConfirmClearHistoryModal
        open={clearAllModalOpen}
        step={clearAllStep}
        loading={clearAllMut.isPending}
        title={t.history.clearAllModalTitle}
        firstStepBody={t.history.clearAllStep1Body}
        firstStepWarning={t.history.clearAllStep1Warning}
        secondStepBody={t.history.clearAllStep2Body}
        secondStepWarning={t.history.clearAllStep2Warning}
        cancelLabel={t.history.clearAllCancel}
        continueLabel={t.history.clearAllContinue}
        backLabel={t.history.clearAllBack}
        confirmLabel={t.history.clearAllFinalConfirm}
        loadingLabel={t.history.clearAllLoading}
        closeLabel={t.common.close}
        onClose={() => {
          setClearAllModalOpen(false)
          setClearAllStep(1)
        }}
        onContinue={() => setClearAllStep(2)}
        onBack={() => setClearAllStep(1)}
        onConfirm={async () => {
          await clearAllMut.mutateAsync()
          clearHistoryInApp(me.account.id)
          setClearAllModalOpen(false)
          setClearAllStep(1)
          await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
          push(t.history.clearAllSuccess, 'success')
        }}
      />
    </div>
  )
}

function ConfirmClearHistoryModal({
  open,
  step,
  loading,
  title,
  firstStepBody,
  firstStepWarning,
  secondStepBody,
  secondStepWarning,
  cancelLabel,
  continueLabel,
  backLabel,
  confirmLabel,
  loadingLabel,
  closeLabel,
  onClose,
  onContinue,
  onBack,
  onConfirm,
}: {
  open: boolean
  step: 1 | 2
  loading: boolean
  title: string
  firstStepBody: string
  firstStepWarning: string
  secondStepBody: string
  secondStepWarning: string
  cancelLabel: string
  continueLabel: string
  backLabel: string
  confirmLabel: string
  loadingLabel: string
  closeLabel: string
  onClose: () => void
  onContinue: () => void
  onBack: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6">
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[86vh] sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
        <div className="space-y-3">
          {step === 1 ? (
            <>
              <p className="text-sm text-slate-700">{firstStepBody}</p>
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">{firstStepWarning}</p>
              <div className="flex gap-2">
                <Button className="w-full" variant="secondary" onClick={onClose}>
                  {cancelLabel}
                </Button>
                <Button className="w-full" variant="danger" onClick={onContinue}>
                  {continueLabel}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-brand-danger">{secondStepBody}</p>
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{secondStepWarning}</p>
              <div className="flex gap-2">
                <Button className="w-full" variant="secondary" onClick={onBack}>
                  {backLabel}
                </Button>
                <Button className="w-full" variant="danger" disabled={loading} onClick={onConfirm}>
                  {loading ? loadingLabel : confirmLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label={closeLabel} onClick={onClose} />
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

function RideHistoryCard({
  ride,
  onRepeat,
  accountId,
  onDelete,
  deleting,
}: {
  ride: Ride
  onRepeat: () => void
  accountId: string
  onDelete: () => void
  deleting: boolean
}) {
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {t.history.deleteRideCta}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
