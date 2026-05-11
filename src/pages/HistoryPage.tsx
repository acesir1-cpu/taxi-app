import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Rating, Ride } from '../types/domain'
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
  const [rideDeleteModal, setRideDeleteModal] = useState<{ open: boolean; rideId: string | null }>({
    open: false,
    rideId: null,
  })
  const [pendingDeleteRide, setPendingDeleteRide] = useState<Ride | null>(null)
  const deleteCommitTimerRef = useRef<number | null>(null)
  const historyPrefs = getHistoryPrivacyPrefs(me.account.id)
  const [hideHistoryInApp, setHideHistoryInApp] = useState(() => historyPrefs.hideHistoryInApp)
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
  const statsRides = useMemo(() => {
    if (historyHidden || historySaveDisabled) return []
    if (!pendingDeleteRide) return rides
    return rides.filter((r) => r.id !== pendingDeleteRide.id)
  }, [historyHidden, historySaveDisabled, pendingDeleteRide, rides])
  const statsRideIds = useMemo(() => statsRides.map((r) => r.id).join('|'), [statsRides])
  const { data: historyRatings = [] } = useQuery({
    queryKey: ['history-ratings', me.profile.id, statsRideIds],
    queryFn: async () => {
      const ratings = await Promise.all(statsRides.map((r) => getRatingForRide(r.id)))
      return ratings.filter((rating): rating is Rating => Boolean(rating))
    },
    enabled: !historySaveDisabled && statsRides.length > 0,
  })
  const historyStats = useMemo(() => {
    const spent = statsRides.reduce((sum, ride) => sum + (ride.finalPrice ?? ride.estimatedPrice), 0)
    const ratingTotal = historyRatings.reduce((sum, rating) => sum + rating.stars, 0)
    return {
      total: statsRides.length,
      spent,
      averageRating: historyRatings.length > 0 ? ratingTotal / historyRatings.length : null,
    }
  }, [historyRatings, statsRides])
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
      if (pendingDeleteRide?.id === r.id) return false
      if (filter === 'all') return true
      if (filter === 'zavrsena') return r.status === 'zavrsena'
      if (filter === 'otkazana') return r.status === 'otkazana'
      if (filter === 'zakazano') return r.orderType === 'zakazano'
      if (filter === 'problem') return complaints.some((c) => c.rideId === r.id)
      return true
    })
  }, [complaints, filter, rides, historyHidden, historySaveDisabled, pendingDeleteRide?.id])

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

  useEffect(() => {
    return () => {
      if (deleteCommitTimerRef.current != null) {
        window.clearTimeout(deleteCommitTimerRef.current)
      }
    }
  }, [])

  async function onRepeat(ride: Ride) {
    const res = await repeatRide(ride.id, me.account.id)
    if ('error' in res) return
    navigate('/app/order', { state: { pickup: res.pickup, destination: res.destination } })
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4" data-passenger-tour-target="history">
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
      {pendingDeleteRide ? (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-900">{t.history.deleteQueued}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (deleteCommitTimerRef.current != null) {
                  window.clearTimeout(deleteCommitTimerRef.current)
                  deleteCommitTimerRef.current = null
                }
                setPendingDeleteRide(null)
              }}
            >
              {t.history.undoDelete}
            </Button>
          </CardContent>
        </Card>
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
      {!historySaveDisabled && !historyHidden ? (
        <>
          <HistoryStatsBar
            total={historyStats.total}
            spent={historyStats.spent}
            averageRating={historyStats.averageRating}
          />
          <div className="flex flex-wrap gap-2">
            <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label={t.history.filterAll} />
            <FilterBtn active={filter === 'zavrsena'} onClick={() => setFilter('zavrsena')} label={t.history.filterDone} />
            <FilterBtn active={filter === 'otkazana'} onClick={() => setFilter('otkazana')} label={t.history.filterCancelled} />
            <FilterBtn active={filter === 'zakazano'} onClick={() => setFilter('zakazano')} label={t.history.filterScheduled} />
            <FilterBtn active={filter === 'problem'} onClick={() => setFilter('problem')} label={t.history.filterProblem} />
          </div>
        </>
      ) : null}
      {isLoading ? <p className="text-sm text-slate-500">{t.common.loading}</p> : null}
      {!historySaveDisabled && !historyHidden ? (
        !isLoading && filtered.length === 0 ? (
          <EmptyState title={t.history.empty} />
        ) : (
          <>
            <ul className="space-y-4">
              {pageItems.map((r) => (
                <li key={r.id}>
                  <RideHistoryCard
                    ride={r}
                    onRepeat={() => onRepeat(r)}
                    accountId={me.account.id}
                    deleting={deleteRideMut.isPending}
                    onDelete={() => {
                      setRideDeleteModal({ open: true, rideId: r.id })
                    }}
                    onProblem={() => navigate(`/app/problem/${r.id}`)}
                  />
                </li>
              ))}
            </ul>
            {filtered.length > RIDES_PER_PAGE ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-brand-border/80 bg-white/80 px-2 py-2 lg:hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant="outlineThin"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="shrink-0 px-2"
                  >
                    {t.history.pagePrev}
                  </Button>
                  <div className="flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant={page === p ? 'default' : 'outlineThin'}
                        className="h-8 min-w-8 shrink-0 px-0"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outlineThin"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="shrink-0 px-2"
                  >
                    {t.history.pageNext}
                  </Button>
                </div>
                <div className="hidden items-center justify-between rounded-xl border border-brand-border/80 bg-white/80 px-3 py-2 lg:flex">
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
          qc.setQueryData(['history', me.profile.id], [])
          qc.setQueryData(['complaints', me.account.id], [])
          setPendingDeleteRide(null)
          setHideHistoryInApp(true)
          setClearAllModalOpen(false)
          setClearAllStep(1)
          await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
          push(t.history.clearAllSuccess, 'success')
        }}
      />
      <ConfirmDeleteRideModal
        open={rideDeleteModal.open}
        loading={deleteRideMut.isPending}
        title={t.history.deleteRideCta}
        body={t.history.deleteRideConfirm}
        cancelLabel={t.common.close}
        confirmLabel={t.history.deleteRideCta}
        onClose={() => setRideDeleteModal({ open: false, rideId: null })}
        onConfirm={async () => {
          if (!rideDeleteModal.rideId) return
          const ride = rides.find((r) => r.id === rideDeleteModal.rideId) ?? null
          setPendingDeleteRide(ride)
          if (deleteCommitTimerRef.current != null) {
            window.clearTimeout(deleteCommitTimerRef.current)
          }
          if (ride) {
            deleteCommitTimerRef.current = window.setTimeout(async () => {
              await deleteRideMut.mutateAsync(ride.id)
              setPendingDeleteRide(null)
              deleteCommitTimerRef.current = null
              push(t.notifications.historyRideDeleted, 'success')
            }, 5000)
          }
          setRideDeleteModal({ open: false, rideId: null })
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 sm:p-6">
      <div className="max-h-[86vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl">
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

function HistoryStatsBar({
  total,
  spent,
  averageRating,
}: {
  total: number
  spent: number
  averageRating: number | null
}) {
  const t = strings()
  const items = [
    { label: t.history.statsTotal, value: String(total) },
    { label: t.history.statsSpent, value: `${spent.toFixed(2)} BAM` },
    { label: t.history.statsRating, value: averageRating == null ? '—' : averageRating.toFixed(1) },
  ]

  return (
    <Card className="border-slate-200/90">
      <CardContent className="grid grid-cols-3 divide-x divide-slate-100 p-0">
        {items.map((item) => (
          <div key={item.label} className="px-3 py-3 text-center sm:px-5 sm:py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-brand-navy sm:text-lg">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ConfirmDeleteRideModal({
  open,
  loading,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean
  loading: boolean
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6">
      <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
        <p className="text-sm text-slate-700">{body}</p>
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {strings().history.deleteRideWarning}
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="w-full" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button className="w-full" variant="danger" onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label={cancelLabel} onClick={onClose} />
    </div>
  )
}

function RideHistoryCard({
  ride,
  onRepeat,
  accountId,
  onDelete,
  onProblem,
  deleting,
}: {
  ride: Ride
  onRepeat: () => void
  accountId: string
  onDelete: () => void
  onProblem: () => void
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
  const rated = Boolean(ratingQ.data)

  return (
    <Card className="border-slate-200/90 transition-shadow duration-150 ease-out sm:hover:shadow-card-hover">
      <CardContent className="space-y-3 p-4 text-sm sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-navy sm:text-base">
            {ride.pickup.label} → {ride.destination.label}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <RideStatusBadge status={ride.status} />
            {ride.orderType === 'zakazano' ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                {t.order.schedule}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="h-px flex-1 bg-slate-200" />
          <span className="inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </div>
        <p className="text-[12px] font-medium text-slate-500">{formatBsDate(ride.createdAt)}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold tabular-nums text-brand-navy">
            {(ride.finalPrice ?? ride.estimatedPrice).toFixed(2)} BAM
          </p>
          {ride.paymentMethod === 'gotovina' ? <p className="text-xs font-medium text-slate-500">{t.order.cash}</p> : null}
        </div>
        {rated ? <p className="text-sm font-medium tabular-nums text-slate-700">⭐ {ratingQ.data!.stars}/5</p> : null}
        {complaint ? (
          <p className="text-xs font-semibold text-orange-700">{t.history.complaintProcessing}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1 pb-1 sm:flex-wrap sm:overflow-visible">
          <button
            type="button"
            onClick={onRepeat}
            className="inline-flex shrink-0 items-center rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-1 text-xs font-bold text-brand-navy transition-colors duration-150 hover:border-brand-teal/50 hover:bg-brand-teal/20"
          >
            {t.history.repeat}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onProblem}
              disabled={Boolean(complaint)}
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {complaint ? t.history.complaintProcessing : t.history.problem}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
              aria-label={t.history.deleteRideCta}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
