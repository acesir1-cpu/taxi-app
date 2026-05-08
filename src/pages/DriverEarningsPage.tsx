import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, CalendarDays, Clock } from 'lucide-react'
import { LoadingState } from '../components/common/LoadingState'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useDriverUi } from '../hooks/useDriverUi'
import type { DriverOutletContext } from '../types/appContext'
import { formatBsDate } from '../utils/date'

export function DriverEarningsPage() {
  const { me } = useOutletContext<DriverOutletContext>()
  const { data: ui, isLoading } = useDriverUi(me.account.id)
  const [asOfMs] = useState(() => Date.now())

  const stats = useMemo(() => {
    if (!ui) return null
    const now = asOfMs
    const dayMs = 86400000
    const weekAgo = now - 7 * dayMs
    const monthAgo = now - 30 * dayMs
    let week = 0
    let month = 0
    let total = 0
    let countCompleted = 0
    let weekRideCount = 0
    let monthRideCount = 0
    const cashAll: typeof ui.history = []
    for (const h of ui.history) {
      const t = new Date(h.date).getTime()
      if (h.status === 'zavrsena' && h.earningsBam > 0) {
        total += h.earningsBam
        countCompleted += 1
        if (t >= weekAgo) {
          week += h.earningsBam
          weekRideCount += 1
        }
        if (t >= monthAgo) {
          month += h.earningsBam
          monthRideCount += 1
        }
        if (h.paymentMethod === 'gotovina') cashAll.push(h)
      }
    }
    week += ui.earningsTodayBam
    month += ui.earningsTodayBam
    total += ui.earningsTodayBam
    const avg = countCompleted > 0 ? total / countCompleted : 0
    cashAll.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    let cashTotal = 0
    for (const h of cashAll) cashTotal += h.earningsBam
    const cashCount = cashAll.length
    const cashRows = cashAll.slice(0, 12)
    return { week, month, total, avg, cashRows, cashTotal, cashCount, weekRideCount, monthRideCount }
  }, [ui, asOfMs])

  if (isLoading || !ui || !stats) {
    return <LoadingState />
  }

  const ridesTodayDisplay = ui.ridesToday + (ui.activeRide ? 1 : 0)
  const ridesTodaySubtitle =
    ridesTodayDisplay === 1 ? '1 vožnja' : ridesTodayDisplay === 0 ? '0 vožnji' : `${ridesTodayDisplay} vožnje`
  const weekRidesSubtitle =
    stats.weekRideCount === 1 ? '1 vožnja' : stats.weekRideCount === 0 ? '0 vožnji' : `${stats.weekRideCount} vožnji`
  const monthRidesSubtitle =
    stats.monthRideCount === 1 ? '1 vožnja' : stats.monthRideCount === 0 ? '0 vožnji' : `${stats.monthRideCount} vožnji`

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-brand-navy">Zarada</CardTitle>
          <p className="text-sm text-slate-600">
            Trenutno je podržano plaćanje isključivo u gotovini.
          </p>
        </CardHeader>
        <CardContent className="grid w-full gap-4 sm:grid-cols-3">
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm max-sm:border-l-2 max-sm:border-l-brand-yellow max-sm:pl-[0.875rem]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:font-bold sm:uppercase">Danas</p>
              <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-brand-navy">{ui.earningsTodayBam.toFixed(2)} BAM</p>
            <p className="mt-1 text-xs text-slate-500">{ridesTodaySubtitle}</p>
          </div>
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:font-bold sm:uppercase">Ova sedmica</p>
              <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-brand-navy">{stats.week.toFixed(2)} BAM</p>
            <p className="mt-1 text-xs text-slate-500 max-sm:block sm:hidden">{weekRidesSubtitle}</p>
          </div>
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:border-2 sm:border-brand-navy/25">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:font-bold sm:uppercase">Ovaj mjesec</p>
              <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-brand-navy">{stats.month.toFixed(2)} BAM</p>
            <p className="mt-1 text-xs text-slate-500 max-sm:block sm:hidden">{monthRidesSubtitle}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">Sažetak</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 pb-3 max-sm:gap-4">
            <span className="min-w-0 text-slate-600 max-sm:text-slate-600">Ukupno (historija + danas, završene)</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900 max-sm:text-slate-900 sm:font-bold sm:text-brand-navy">
              {stats.total.toFixed(2)} BAM
            </span>
          </div>
          <div className="flex flex-row items-center justify-between gap-3 pt-3 max-sm:gap-4">
            <span className="min-w-0 text-slate-600 max-sm:text-slate-600">Prosjek po vožnji</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900 max-sm:text-slate-900 sm:font-bold sm:text-brand-navy">
              {stats.avg > 0 ? `${stats.avg.toFixed(2)} BAM` : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
          <CardTitle className="text-base text-brand-navy">Gotovinske vožnje</CardTitle>
          <Badge variant="outline" className="font-semibold tabular-nums">
            {stats.cashCount}
          </Badge>
        </CardHeader>
        <CardContent>
          {stats.cashCount === 0 ? (
            <p className="text-slate-500">Nema završenih gotovinskih vožnji u listi.</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {stats.cashRows.map((h) => {
                  const routeLabel = `${h.pickupLabel} → ${h.destinationLabel}`
                  return (
                    <li
                      key={h.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="hidden font-semibold text-brand-navy sm:block sm:font-normal sm:text-slate-700">
                          {formatBsDate(h.date)} · {routeLabel}
                        </p>
                        <p className="truncate font-semibold text-brand-navy sm:hidden">{routeLabel}</p>
                        <p className="mt-0.5 text-xs text-slate-500 sm:hidden">{formatBsDate(h.date)}</p>
                      </div>
                      <span className="shrink-0 self-start whitespace-nowrap font-semibold tabular-nums text-brand-navy">
                        {h.earningsBam.toFixed(2)} BAM
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm">
                <span className="min-w-0 font-bold uppercase tracking-wide text-slate-600">UKUPNO</span>
                <span className="shrink-0 whitespace-nowrap font-bold text-brand-navy">{stats.cashTotal.toFixed(2)} BAM</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
