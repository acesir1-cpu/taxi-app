import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DatabaseBackup,
  FileBarChart,
  Gauge,
  Info,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { AppLogo } from '../components/brand/AppLogo'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import managerAvatar from '../../pictures/woman.png'
import businessAdminAvatar from '../../pictures/man.png'
import itAdminAvatar from '../../pictures/girl.png'

type FutureRoleDemoKind = 'manager' | 'business-admin' | 'it-admin'
type DemoTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

type RoleDemoConfig = {
  title: string
  eyebrow: string
  displayName: string
  email: string
  avatar: string
  badge: string
  summary: string
  activeItem: string
  navItems: Array<{ label: string; icon: LucideIcon }>
  metrics: Array<{ label: string; value: string; note: string; icon: LucideIcon; tone: DemoTone }>
  previewTitle: string
  previewDescription: string
  spotlightRows: Array<{ label: string; value: string; status: string; tone: DemoTone }>
  chartRows: Array<{ label: string; value: string; width: string; tone: DemoTone }>
}

const futureNavigationRows: Array<{ role: string; items: string[]; icon: LucideIcon }> = [
  {
    role: 'Menadžer',
    icon: BarChart3,
    items: ['Dashboard analitike', 'Izvještaji', 'Performanse vozača', 'Prihodi', 'Trendovi'],
  },
  {
    role: 'Poslovni administrator',
    icon: BriefcaseBusiness,
    items: ['Upravljanje korisnicima', 'Vozačima', 'Vozilima', 'Cjenovnikom', 'Smjenama'],
  },
  {
    role: 'IT administrator',
    icon: ShieldCheck,
    items: ['Korisničke privilegije', 'Sigurnost', 'Logovi', 'Backup', 'Tehnička podešavanja'],
  },
]

const roleDemoConfigs: Record<FutureRoleDemoKind, RoleDemoConfig> = {
  manager: {
    title: 'Menadžer',
    eyebrow: 'Post-MVP uloga',
    displayName: 'Selma Hadžić',
    email: 'menadzer@urbanflow.ba',
    avatar: managerAvatar,
    badge: 'Upravljanje poslovanjem',
    activeItem: 'Dashboard analitike',
    summary:
      'Demo prikaz budućeg menadžerskog pregleda za analitiku, izvještaje, prihode i trendove poslovanja.',
    navItems: [
      { label: 'Dashboard analitike', icon: LayoutDashboard },
      { label: 'Izvještaji', icon: FileBarChart },
      { label: 'Performanse vozača', icon: Gauge },
      { label: 'Prihodi', icon: Wallet },
      { label: 'Trendovi', icon: TrendingUp },
    ],
    metrics: [
      { label: 'Prihod danas', value: '1.248 BAM', note: '+12% u odnosu na jučer', icon: Wallet, tone: 'success' },
      { label: 'Aktivne vožnje', value: '18', note: 'Operativni presjek', icon: Car, tone: 'default' },
      { label: 'Prosječna ocjena', value: '4.86', note: 'Vozači u smjeni', icon: CheckCircle2, tone: 'success' },
      { label: 'Otvoreni trendovi', value: '5', note: 'Za upravljački pregled', icon: LineChart, tone: 'info' },
    ],
    previewTitle: 'Analitički pregled flote',
    previewDescription: 'Sažetak performansi za budući menadžerski panel.',
    spotlightRows: [
      { label: 'Najaktivnija zona', value: 'Centar / Stari Grad', status: '+18%', tone: 'success' },
      { label: 'Najbolji period', value: '16:00 - 18:00', status: 'vrh', tone: 'info' },
      { label: 'Rizik prihoda', value: '3 vožnje otkazane', status: 'pratiti', tone: 'warning' },
    ],
    chartRows: [
      { label: 'Prihodi', value: '74%', width: '74%', tone: 'success' },
      { label: 'Potražnja', value: '68%', width: '68%', tone: 'info' },
      { label: 'Dostupnost vozača', value: '82%', width: '82%', tone: 'default' },
    ],
  },
  'business-admin': {
    title: 'Poslovni administrator',
    eyebrow: 'Post-MVP uloga',
    displayName: 'Adnan Kovač',
    email: 'poslovni.admin@urbanflow.ba',
    avatar: businessAdminAvatar,
    badge: 'Operativna administracija',
    activeItem: 'Upravljanje korisnicima',
    summary:
      'Demo prikaz budućeg poslovnog administriranja korisnika, vozača, vozila, cjenovnika i smjena.',
    navItems: [
      { label: 'Upravljanje korisnicima', icon: Users },
      { label: 'Vozači', icon: UserCog },
      { label: 'Vozila', icon: Car },
      { label: 'Cjenovnik', icon: ReceiptText },
      { label: 'Smjene', icon: CalendarClock },
    ],
    metrics: [
      { label: 'Korisnici', value: '1.284', note: 'Aktivni računi', icon: Users, tone: 'default' },
      { label: 'Vozači', value: '42', note: '31 dostupno za raspored', icon: UserCog, tone: 'success' },
      { label: 'Vozila', value: '39', note: '4 čekaju servis', icon: Car, tone: 'warning' },
      { label: 'Smjene danas', value: '12', note: 'Planirano za potvrdu', icon: CalendarClock, tone: 'info' },
    ],
    previewTitle: 'Administrativni pregled',
    previewDescription: 'Sažetak operativnih podataka za buduće poslovno održavanje sistema.',
    spotlightRows: [
      { label: 'Novi korisnici', value: '24 u zadnjih 7 dana', status: 'rast', tone: 'success' },
      { label: 'Vozila za servis', value: 'K12-M-458, A77-K-190', status: 'provjera', tone: 'warning' },
      { label: 'Smjene za potvrdu', value: 'Dnevna / Noćna', status: '2 nacrta', tone: 'info' },
    ],
    chartRows: [
      { label: 'Popunjenost smjena', value: '76%', width: '76%', tone: 'info' },
      { label: 'Validna dokumentacija', value: '88%', width: '88%', tone: 'success' },
      { label: 'Ažurnost cjenovnika', value: '64%', width: '64%', tone: 'warning' },
    ],
  },
  'it-admin': {
    title: 'IT administrator',
    eyebrow: 'Post-MVP uloga',
    displayName: 'Nina Softić',
    email: 'it.admin@urbanflow.ba',
    avatar: itAdminAvatar,
    badge: 'Tehnička administracija',
    activeItem: 'Korisničke privilegije',
    summary:
      'Demo prikaz buduće tehničke administracije za privilegije, sigurnost, logove, backup i sistemska podešavanja.',
    navItems: [
      { label: 'Korisničke privilegije', icon: KeyRound },
      { label: 'Sigurnost', icon: LockKeyhole },
      { label: 'Logovi', icon: ClipboardList },
      { label: 'Backup', icon: DatabaseBackup },
      { label: 'Tehnička podešavanja', icon: SlidersHorizontal },
    ],
    metrics: [
      { label: 'Sigurnosni događaji', value: '7', note: 'Niski prioritet', icon: ShieldCheck, tone: 'info' },
      { label: 'Privilegije', value: '18', note: 'Role za budući RBAC', icon: KeyRound, tone: 'default' },
      { label: 'Backup', value: 'OK', note: 'Zadnji zapis 02:15', icon: DatabaseBackup, tone: 'success' },
      { label: 'Sistemski logovi', value: '126', note: 'Danas evidentirano', icon: ClipboardList, tone: 'warning' },
    ],
    previewTitle: 'Tehnički pregled sistema',
    previewDescription: 'Sažetak sigurnosti i održavanja za budući IT administratorski panel.',
    spotlightRows: [
      { label: 'Backup status', value: 'Automatski backup uspješan', status: 'OK', tone: 'success' },
      { label: 'API odziv', value: '218 ms prosjek', status: 'stabilno', tone: 'info' },
      { label: 'Log upozorenja', value: '3 neuspješne prijave', status: 'pratiti', tone: 'warning' },
    ],
    chartRows: [
      { label: 'Sigurnost', value: '91%', width: '91%', tone: 'success' },
      { label: 'Dostupnost servisa', value: '97%', width: '97%', tone: 'info' },
      { label: 'Kapacitet backup-a', value: '72%', width: '72%', tone: 'default' },
    ],
  },
}

const toneStyles: Record<DemoTone, { icon: string; badge: string; bar: string; row: string }> = {
  default: {
    icon: 'bg-brand-navy/5 text-brand-navy',
    badge: 'bg-slate-100 text-slate-700',
    bar: 'bg-brand-navy',
    row: 'border-slate-200 bg-slate-50/80',
  },
  success: {
    icon: 'bg-emerald-50 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    bar: 'bg-emerald-500',
    row: 'border-emerald-100 bg-emerald-50/80',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-700',
    badge: 'bg-amber-100 text-amber-900',
    bar: 'bg-brand-yellow',
    row: 'border-amber-100 bg-amber-50/80',
  },
  danger: {
    icon: 'bg-red-50 text-red-700',
    badge: 'bg-red-100 text-red-800',
    bar: 'bg-red-500',
    row: 'border-red-100 bg-red-50/80',
  },
  info: {
    icon: 'bg-sky-50 text-sky-700',
    badge: 'bg-sky-100 text-sky-800',
    bar: 'bg-sky-500',
    row: 'border-sky-100 bg-sky-50/80',
  },
}

export function FutureRoleDemoPage({ role }: { role: FutureRoleDemoKind }) {
  const config = roleDemoConfigs[role]

  return (
    <div className="app-shell-atmosphere min-h-screen pb-6 text-brand-navy">
      <header className="sticky top-0 z-[280] border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex min-h-16 max-w-[92rem] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <AppLogo variant="light" brandName="UrbanFlow Taxi" className="gap-1.5" />

          <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1 lg:order-2 lg:w-auto lg:overflow-visible">
            {config.navItems.map((item) => {
              const Icon = item.icon
              const active = item.label === config.activeItem
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-disabled="true"
                  className={cn(
                    'inline-flex shrink-0 cursor-default items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-brand-yellow/30 text-brand-navy shadow-[0_1px_0_rgba(15,23,42,0.08)]'
                      : 'bg-transparent text-slate-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="order-2 flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 text-sm font-medium text-slate-700 lg:order-3">
            <img
              src={config.avatar}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-white bg-white object-cover shadow-sm"
            />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-bold text-brand-navy">{config.displayName}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{config.title}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 py-6 sm:px-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md border-brand-yellow/40 bg-brand-yellow/15 px-3 py-1 font-extrabold uppercase tracking-wide">
                {config.eyebrow}
              </Badge>
              <Badge variant="outline" className="rounded-md px-3 py-1 font-bold">
                Demo stranica za dokumentaciju
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{config.title}</h1>
            <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-600">{config.summary}</p>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm font-semibold leading-6 text-amber-950">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-yellow" aria-hidden />
              <p>
                Detaljna navigacija za menadžera, poslovnog administratora i IT administratora nije dio
                glavnog MVP fokusa, ali je predviđena za buduće verzije sistema.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-4">
              <img
                src={config.avatar}
                alt=""
                className="h-16 w-16 rounded-2xl border border-white bg-white object-cover shadow-sm"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-brand-navy">{config.displayName}</p>
                <p className="truncate text-sm font-semibold text-slate-500">{config.email}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <ProfileLine icon={ShieldCheck} label="Uloga" value={config.title} />
              <ProfileLine icon={BriefcaseBusiness} label="Domena" value={config.badge} />
              <ProfileLine icon={Clock3} label="Status" value="Planirano nakon MVP-a" />
            </div>
          </aside>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {config.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Planirani meni</p>
            <div className="mt-4 space-y-2">
              {config.navItems.map((item) => {
                const Icon = item.icon
                const active = item.label === config.activeItem
                return (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold',
                      active
                        ? 'border-brand-yellow/40 bg-brand-yellow/15 text-brand-navy'
                        : 'border-slate-100 bg-slate-50/80 text-slate-700',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-yellow' : 'text-slate-500')} />
                    <span>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Demo sadržaj</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-brand-navy">{config.previewTitle}</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{config.previewDescription}</p>
              </div>
              <Badge variant="outline" className="rounded-md px-3 py-1 font-bold">
                Statični prikaz
              </Badge>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-3">
                {config.spotlightRows.map((row) => (
                  <div key={row.label} className={cn('rounded-2xl border p-4', toneStyles[row.tone].row)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{row.label}</p>
                        <p className="mt-1 truncate text-sm font-black text-brand-navy">{row.value}</p>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold', toneStyles[row.tone].badge)}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Pregled pokazatelja</p>
                    <p className="mt-1 text-sm font-bold text-brand-navy">Planirani vizualni panel</p>
                  </div>
                  <Activity className="h-5 w-5 text-brand-teal" aria-hidden />
                </div>
                <div className="space-y-4">
                  {config.chartRows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="text-brand-navy">{row.value}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white">
                        <div className={cn('h-full rounded-full', toneStyles[row.tone].bar)} style={{ width: row.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-card">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Primjer budućih menija</p>
            <h2 className="mt-1 text-lg font-black text-brand-navy">Planirane navigacijske stavke nakon MVP-a</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-[260px] px-5 py-3">Uloga</th>
                  <th className="px-5 py-3">Planirane navigacijske stavke nakon MVP-a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {futureNavigationRows.map((row) => {
                  const Icon = row.icon
                  return (
                    <tr key={row.role}>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/20 text-brand-navy">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="font-black text-brand-navy">{row.role}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {row.items.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function MetricCard({
  metric,
}: {
  metric: RoleDemoConfig['metrics'][number]
}) {
  const Icon = metric.icon
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', toneStyles[metric.tone].icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold leading-snug tracking-wide text-slate-600">{metric.label}</p>
          <p className="truncate text-xl font-bold text-brand-navy">{metric.value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{metric.note}</p>
    </div>
  )
}

function ProfileLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-brand-navy">{value}</p>
      </div>
    </div>
  )
}
