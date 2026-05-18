import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Filter, Search } from 'lucide-react'
import { LoadingState } from '../components/common/LoadingState'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useDriverUi } from '../hooks/useDriverUi'
import type { DriverHistoryFilterKind } from '../types/domain'
import type { DriverOutletContext } from '../types/appContext'
import { strings } from '../i18n/strings'

type FilterTab = 'sve' | DriverHistoryFilterKind

const DRIVER_HISTORY_PER_PAGE = 5

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    zavrsena: 'Završena',
    otkazana: 'Otkazana',
    problem: 'Problem',
    neuspjesna: 'Neuspješna',
    prihvacena: 'Prihvaćena',
    vozac_na_putu: 'Vozač stiže',
    stigao: 'Stigao',
    u_toku: 'U toku',
  }
  return m[s] ?? s
}

export function DriverHistoryPage() {
  const t = strings()
  const { me } = useOutletContext<DriverOutletContext>()
  const { data: ui, isLoading } = useDriverUi(me.account.id)
  const [tab, setTab] = useState<FilterTab>('sve')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'sve', label: t.driver.historyFilterAll },
    { id: 'zavrsena', label: t.driver.historyFilterDone },
    { id: 'otkazana', label: t.driver.historyFilterCancelled },
    { id: 'problem', label: t.driver.historyFilterProblem },
  ]

  const filtered = useMemo(() => {
    if (!ui) return []
    let rows = ui.history
    if (tab === 'zavrsena') rows = rows.filter((h) => h.status === 'zavrsena')
    if (tab === 'otkazana') rows = rows.filter((h) => h.status === 'otkazana')
    if (tab === 'problem') rows = rows.filter((h) => h.status === 'problem' || h.status === 'neuspjesna')
    const qq = q.trim().toLowerCase()
    if (qq) {
      rows = rows.filter(
        (h) =>
          h.pickupLabel.toLowerCase().includes(qq) ||
          h.destinationLabel.toLowerCase().includes(qq) ||
          h.passengerName.toLowerCase().includes(qq)
      )
    }
    return rows
  }, [ui, tab, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / DRIVER_HISTORY_PER_PAGE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * DRIVER_HISTORY_PER_PAGE
    return filtered.slice(start, start + DRIVER_HISTORY_PER_PAGE)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [tab, q])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const detail = detailId && ui ? ui.history.find((h) => h.id === detailId) : null

  if (isLoading || !ui) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-brand-navy">{t.driver.historyTitle}</CardTitle>
          <p className="mt-2 text-xs font-medium leading-snug text-slate-600">{t.driver.historyNoDeleteNotice}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder={t.driver.historySearchPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-50 p-1">
              <Filter className="ml-2 hidden h-4 w-4 text-slate-400 sm:block" />
              {tabs.map((tabItem) => (
                <Button
                  key={tabItem.id}
                  size="sm"
                  variant={tab === tabItem.id ? 'default' : 'ghost'}
                  className="rounded-lg"
                  onClick={() => setTab(tabItem.id)}
                >
                  {tabItem.label}
                </Button>
              ))}
            </div>
          </div>

          <ul className="space-y-2">
            {pageItems.map((h) => (
              <li key={h.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      {new Date(h.date).toLocaleString('bs-BA')}
                    </p>
                    <p className="font-semibold text-brand-navy">
                      {h.pickupLabel} → {h.destinationLabel}
                    </p>
                    <p className="text-sm text-slate-600">{h.passengerName}</p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium text-slate-500">{t.driver.historyStatus}:</span>{' '}
                      <span className="font-semibold">{statusLabel(h.status)}</span>
                      {h.rating != null ? (
                        <span className="ml-2 text-brand-yellow-dark">★ {h.rating}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-navy">{h.earningsBam.toFixed(2)} BAM</p>
                    <p className="text-xs text-slate-500">{h.paymentMethod}</p>
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => setDetailId(h.id)}>
                      {t.driver.historyDetails}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {filtered.length > DRIVER_HISTORY_PER_PAGE ? (
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
          {filtered.length === 0 ? <p className="py-8 text-center text-slate-500">{t.driver.historyNoResults}</p> : null}
        </CardContent>
      </Card>

      {detail ? (
        <div className="fixed inset-0 z-[400] grid place-items-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-brand-navy">{t.driver.historyDetailTitle}</h3>
            <p className="mt-1 text-xs text-slate-500">{t.driver.historyOrientationHint}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">{t.driver.historyDate}</dt>
                <dd className="font-medium">{new Date(detail.date).toLocaleString('bs-BA')}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.driver.historyRoute}</dt>
                <dd className="font-medium">
                  {detail.pickupLabel} → {detail.destinationLabel}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.driver.historyPassenger}</dt>
                <dd className="font-medium">{detail.passengerName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.driver.historyStatusLabel}</dt>
                <dd className="font-medium">{statusLabel(detail.status)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.driver.historyEarnings}</dt>
                <dd className="font-medium">{detail.earningsBam.toFixed(2)} BAM</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.driver.historyMethod}</dt>
                <dd className="font-medium">{detail.paymentMethod}</dd>
              </div>
              {detail.rating != null ? (
                <div>
                  <dt className="text-slate-500">{t.driver.historyRating}</dt>
                  <dd className="font-medium">{detail.rating}</dd>
                </div>
              ) : null}
              {detail.durationMin != null ? (
                <div>
                  <dt className="text-slate-500">{t.driver.historyDuration}</dt>
                  <dd className="font-medium">{detail.durationMin} min</dd>
                </div>
              ) : null}
              {detail.cancellationReason ? (
                <div>
                  <dt className="text-slate-500">{t.driver.historyCancelReason}</dt>
                  <dd className="font-medium">{detail.cancellationReason}</dd>
                </div>
              ) : null}
              {detail.problemType ? (
                <div>
                  <dt className="text-slate-500">{t.driver.historyProblemType}</dt>
                  <dd className="font-medium">{detail.problemType}</dd>
                </div>
              ) : null}
            </dl>
            <Button className="mt-6 w-full" onClick={() => setDetailId(null)}>
              {t.common.close}
            </Button>
          </div>
          <button type="button" className="absolute inset-0 -z-10" aria-label={t.common.close} onClick={() => setDetailId(null)} />
        </div>
      ) : null}
    </div>
  )
}
