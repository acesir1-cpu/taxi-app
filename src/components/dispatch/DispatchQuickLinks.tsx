import { AlertTriangle, Clock, PhoneCall, Route, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { KpiCard } from './dispatchUi'
import { strings } from '../../i18n/strings'
import type { DispatchKpis } from '../../services/dispatcherApi'

export function DispatchQuickLinks({
  kpis,
  waitingCount,
}: {
  kpis: DispatchKpis
  waitingCount: number
}) {
  const t = strings()
  const d = t.dispatcher.dashboard
  const q = d.quickLinks
  const problemTotal = kpis.problemItems + kpis.openComplaints

  return (
    <section aria-label={q.title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{q.title}</p>
        <Link to="/dispatch/rides" className="text-xs font-bold text-brand-teal hover:underline">
          {q.allRides}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label={q.waitingAssignment}
          value={waitingCount}
          tone={waitingCount > 0 ? 'warning' : 'default'}
          to="/dispatch/rides?filter=cekaju"
        />
        <KpiCard
          icon={<Route className="h-5 w-5" />}
          label={d.kpiActiveRides}
          value={kpis.activeRides}
          to="/dispatch/rides?filter=aktivne"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label={d.kpiAvailableDrivers}
          value={kpis.availableDrivers}
          tone="success"
          to="/dispatch/drivers?filter=dostupan"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label={q.problems}
          value={problemTotal}
          tone={problemTotal > 0 ? 'danger' : 'default'}
          to="/dispatch/problems"
        />
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label={d.kpiTodayRevenue}
          value={`${kpis.todayRevenueBam.toFixed(2)} BAM`}
          to="/dispatch/reports"
        />
        <KpiCard
          icon={<PhoneCall className="h-5 w-5" />}
          label={q.phoneRequest}
          value={q.open}
          to="/dispatch/rides#phone-order"
        />
      </div>
    </section>
  )
}
