import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Car,
  CheckCircle2,
  CircleX,
  Clock3,
  History,
  Info,
  MapPinned,
  Navigation,
  PanelTop,
  Route,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { AppLogo } from '../components/brand/AppLogo'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'default'
type FeedbackTone = 'success' | 'error' | 'info'

const demoScreens: Array<{
  title: string
  role: string
  status: string
  statusTone: Tone
  route: string
  note: string
  primaryAction: string
  cancelAction: string
}> = [
  {
    title: 'Naručivanje vožnje',
    role: 'Putnik',
    status: 'Slobodan',
    statusTone: 'success',
    route: 'Skenderija -> Aerodrom',
    note: 'Glavna akcija je žuta i vizuelno najjača.',
    primaryAction: 'Potvrdi vožnju',
    cancelAction: 'Otkazivanje',
  },
  {
    title: 'Aktivna vožnja',
    role: 'Vozač',
    status: 'U toku',
    statusTone: 'success',
    route: 'Baščaršija -> Grbavica',
    note: 'Isti redoslijed akcija ostaje i tokom vožnje.',
    primaryAction: 'Završi vožnju',
    cancelAction: 'Otkazivanje',
  },
  {
    title: 'Pregled problema',
    role: 'Dispečer',
    status: 'Problem',
    statusTone: 'danger',
    route: 'Alipašino -> Centar',
    note: 'Problem i otkazano uvijek koriste crveni status.',
    primaryAction: 'Riješi slučaj',
    cancelAction: 'Otkazivanje',
  },
]

const statusExamples: Array<{
  label: string
  tone: Tone
  description: string
  rule: string
}> = [
  {
    label: 'Slobodan',
    tone: 'success',
    description: 'Vozač ili vozilo je dostupno.',
    rule: 'Uvijek zeleno',
  },
  {
    label: 'U toku',
    tone: 'success',
    description: 'Vožnja se normalno izvršava.',
    rule: 'Pozitivan tok',
  },
  {
    label: 'Na čekanju',
    tone: 'warning',
    description: 'Akcija još nije završena.',
    rule: 'Žuto upozorenje',
  },
  {
    label: 'Problem',
    tone: 'danger',
    description: 'Potrebna je pažnja korisnika ili dispečera.',
    rule: 'Uvijek crveno',
  },
  {
    label: 'Otkazano',
    tone: 'danger',
    description: 'Proces je prekinut ili neuspješan.',
    rule: 'Uvijek crveno',
  },
]

const statusMeaningRows: Array<{
  label: string
  meaning: string
  className: string
  dotClassName: string
}> = [
  {
    label: 'Slobodan',
    meaning: 'Vozač je dostupan za novu vožnju.',
    className: 'bg-emerald-100 text-emerald-800',
    dotClassName: 'bg-brand-teal',
  },
  {
    label: 'Zauzet',
    meaning: 'Vozač trenutno nije dostupan za novu dodjelu.',
    className: 'bg-amber-100 text-amber-900',
    dotClassName: 'bg-brand-yellow',
  },
  {
    label: 'Na vožnji',
    meaning: 'Vozač trenutno izvršava aktivnu vožnju.',
    className: 'bg-emerald-100 text-emerald-800',
    dotClassName: 'bg-emerald-500',
  },
  {
    label: 'Pauza',
    meaning: 'Vozač je privremeno nedostupan.',
    className: 'bg-indigo-100 text-indigo-800',
    dotClassName: 'bg-indigo-500',
  },
  {
    label: 'Čeka dodjelu',
    meaning: 'Zahtjev još nije dodijeljen vozaču.',
    className: 'bg-amber-100 text-amber-900',
    dotClassName: 'bg-amber-500',
  },
  {
    label: 'Otkazano',
    meaning: 'Vožnja je otkazana.',
    className: 'bg-red-100 text-red-800',
    dotClassName: 'bg-red-500',
  },
  {
    label: 'Završeno',
    meaning: 'Vožnja je realizovana.',
    className: 'bg-emerald-100 text-emerald-800',
    dotClassName: 'bg-emerald-500',
  },
]

const visualOutputRows: Array<{
  element: string
  use: string
  example: string
  icon: LucideIcon
  tone: Tone
}> = [
  {
    element: 'Boje',
    use: 'Označavanje statusa, prioriteta i ishoda akcije.',
    example: 'Crvena odmah označava konflikt ili otkazivanje.',
    icon: AlertTriangle,
    tone: 'danger',
  },
  {
    element: 'Badgevi',
    use: 'Kratke statusne oznake koje se brzo čitaju u listama i karticama.',
    example: 'Novo, Ceka, Slobodan, Problem',
    icon: CheckCircle2,
    tone: 'success',
  },
  {
    element: 'Ikonice',
    use: 'Brzo prepoznavanje tipa informacije bez dodatnog objašnjenja.',
    example: 'Mapa, auto, korisnik, upozorenje, sat, lokacija',
    icon: MapPinned,
    tone: 'default',
  },
  {
    element: 'Highlight',
    use: 'Isticanje kritičnih informacija koje traže brzu reakciju.',
    example: 'Kašnjenje 12 min ili konflikt dodjele',
    icon: Clock3,
    tone: 'warning',
  },
  {
    element: 'Kartice',
    use: 'Grupisanje podataka o vožnji, vozaču ili zahtjevu.',
    example: 'Jedna kartica = jedan operativni kontekst',
    icon: PanelTop,
    tone: 'default',
  },
]

const visualColorRows: Array<{
  color: string
  meaning: string
  swatch: string
  badgeClass: string
}> = [
  {
    color: 'Zelena',
    meaning: 'Slobodan vozač / uspješna akcija',
    swatch: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    color: 'Narandzasta',
    meaning: 'Čekanje / zahtjev u obradi',
    swatch: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-900',
  },
  {
    color: 'Plava',
    meaning: 'Aktivna vožnja / neutralna informacija',
    swatch: 'bg-sky-500',
    badgeClass: 'bg-sky-100 text-sky-800',
  },
  {
    color: 'Crvena',
    meaning: 'Problem / greška / otkazivanje / konflikt',
    swatch: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-800',
  },
  {
    color: 'Siva',
    meaning: 'Neaktivan ili završen status',
    swatch: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
]

const visualIconRows: Array<{ label: string; icon: LucideIcon; className: string }> = [
  { label: 'Mapa', icon: MapPinned, className: 'bg-sky-100 text-sky-800' },
  { label: 'Auto', icon: Car, className: 'bg-emerald-100 text-emerald-800' },
  { label: 'Korisnik', icon: UserRound, className: 'bg-slate-100 text-slate-700' },
  { label: 'Upozorenje', icon: AlertTriangle, className: 'bg-red-100 text-red-800' },
  { label: 'Sat', icon: Clock3, className: 'bg-amber-100 text-amber-900' },
  { label: 'Lokacija', icon: MapPinned, className: 'bg-brand-yellow/25 text-brand-navy' },
]

const screenOrganizationRows: Array<{
  role: string
  title: string
  description: string
  steps: string[]
  icon: LucideIcon
}> = [
  {
    role: 'Dispečer',
    title: 'Mapa + operativne kartice',
    description:
      'UI je organizovan oko mape i operativnih kartica. Mapa daje prostorni pregled, dok kartice prikazuju detalje o zahtjevima, vozačima i vožnjama.',
    steps: ['Mapa', 'Zahtjevi', 'Vozači', 'Vožnje'],
    icon: MapPinned,
  },
  {
    role: 'Vozač',
    title: 'Linearni tok rada',
    description:
      'UI je organizovan linearno prema toku rada vozača, tako da je sljedeći korak uvijek jasno vidljiv.',
    steps: ['Status', 'Nova vožnja', 'Navigacija', 'Početak vožnje', 'Završetak'],
    icon: Navigation,
  },
  {
    role: 'Korisnik',
    title: 'Jednostavan tok naručivanja',
    description:
      'UI je organizovan oko jednostavnog toka od unosa lokacije do praćenja vozača i završne ocjene.',
    steps: ['Unos lokacije', 'Procjena', 'Naručivanje', 'Praćenje vozača', 'Ocjena'],
    icon: UserRound,
  },
]

const menuItems: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Naruči', icon: Car },
  { label: 'Aktivna', icon: Navigation },
  { label: 'Zakazane', icon: CalendarClock },
  { label: 'Historija', icon: History },
  { label: 'Profil', icon: UserRound },
  { label: 'Postavke', icon: Settings },
]

const messageExamples: Array<{
  title: string
  text: string
  tone: Tone
  icon: LucideIcon
}> = [
  {
    title: 'Vožnja potvrđena',
    text: 'Poruka uspjeha koristi istu strukturu: ikona, naslov i kratak opis.',
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    title: 'Potrebna provjera',
    text: 'Upozorenja imaju isti format, samo se mijenja boja i sadržaj.',
    tone: 'warning',
    icon: AlertTriangle,
  },
  {
    title: 'Vožnja otkazana',
    text: 'Greške i otkazivanja uvijek su crvena poruka sa jasnim razlogom.',
    tone: 'danger',
    icon: CircleX,
  },
]

const notificationRows: Array<{
  label: string
  explanation: string
  target: string
  tone: Tone
  icon: LucideIcon
}> = [
  {
    label: 'Nova vožnja',
    explanation: 'Sistem obavještava dispečera i vozača o novom zahtjevu za vožnju.',
    target: 'Dispečer / vozač',
    tone: 'default',
    icon: Car,
  },
  {
    label: 'Otkazivanje',
    explanation: 'Korisnik, vozač ili dispečer je otkazao vožnju.',
    target: 'Putnik / vozač / dispečer',
    tone: 'danger',
    icon: CircleX,
  },
  {
    label: 'Konflikt',
    explanation: 'Sistem javlja konflikt, npr. isti vozač pokušava biti dodijeljen na dvije vožnje.',
    target: 'Dispečer',
    tone: 'danger',
    icon: AlertTriangle,
  },
  {
    label: 'Kašnjenje',
    explanation: 'Vozač kasni u odnosu na predviđeni ETA ili očekivani dolazak.',
    target: 'Putnik / dispečer',
    tone: 'warning',
    icon: Clock3,
  },
  {
    label: 'Neuspjela dodjela',
    explanation: 'Nema dostupnih vozača u datom trenutku ili dodjela nije uspjela.',
    target: 'Dispečer / putnik',
    tone: 'warning',
    icon: Bell,
  },
]

const feedbackRows: Array<{
  action: string
  message: string
  tone: FeedbackTone
  icon: LucideIcon
}> = [
  {
    action: 'Korisnik naruči vožnju',
    message: 'Zahtjev za vožnju je uspješno poslan.',
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    action: 'Sistem dodijeli vozača',
    message: 'Vozač je dodijeljen.',
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    action: 'Vozač prihvati vožnju',
    message: 'Vozač je prihvatio vožnju.',
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    action: 'Vozač završi vožnju',
    message: 'Vožnja je završena.',
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    action: 'Greška pri dodjeli',
    message: 'Dodjela nije moguća jer vozač više nije dostupan.',
    tone: 'error',
    icon: AlertTriangle,
  },
  {
    action: 'Sistem obrađuje zahtjev',
    message: 'Dodjela vozača je u toku...',
    tone: 'info',
    icon: Info,
  },
]

const toneClasses: Record<Tone, { chip: string; icon: string; surface: string; line: string }> = {
  success: {
    chip: 'bg-emerald-100 text-emerald-800',
    icon: 'bg-emerald-100 text-emerald-700',
    surface: 'border-emerald-200 bg-emerald-50/80',
    line: 'bg-emerald-500',
  },
  warning: {
    chip: 'bg-amber-100 text-amber-900',
    icon: 'bg-amber-100 text-amber-700',
    surface: 'border-amber-200 bg-amber-50/80',
    line: 'bg-amber-500',
  },
  danger: {
    chip: 'bg-red-100 text-red-800',
    icon: 'bg-red-100 text-red-700',
    surface: 'border-red-200 bg-red-50/80',
    line: 'bg-red-500',
  },
  default: {
    chip: 'bg-slate-100 text-slate-700',
    icon: 'bg-slate-100 text-slate-700',
    surface: 'border-slate-200 bg-white',
    line: 'bg-slate-400',
  },
}

export function DesignConsistencyPage() {
  return (
    <div className="app-shell-atmosphere app-shell-atmosphere--passenger min-h-screen text-brand-navy">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[82rem] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <AppLogo brandName="UrbanFlow Taxi" />
          <Badge variant="outline" className="hidden rounded-md px-3 py-1 sm:inline-flex">
            Demo dokaz za izvještaj
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[82rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card sm:p-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-yellow/30 bg-brand-yellow/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-navy">
              <ShieldCheck className="h-4 w-4 text-brand-yellow" />
              Konzistentnost interfejsa
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Isti obrasci dizajna kroz sve ekrane
            </h1>
            <p className="mt-4 max-w-4xl text-base font-medium leading-7 text-slate-600">
              Kroz aplikaciju se koriste ista dugmad, iste boje statusa, ista terminologija i isti način
              prikaza poruka. Korisnik jednom nauči značenje elemenata i zatim ih prepoznaje na svakom
              ekranu, što smanjuje vrijeme učenja sistema i olakšava izvršavanje zadataka.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <EvidencePill icon={CheckCircle2} label="Glavna akcija je uvijek žuta" />
              <EvidencePill icon={CircleX} label="Otkazivanje je uvijek crveno" />
              <EvidencePill icon={MapPinned} label="Ikona mape vodi na lokaciju" />
              <EvidencePill icon={Bell} label="Poruke imaju isti obrazac" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Sažetak za dokument</p>
            <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-700">
              <p>Dugme za glavnu akciju uvijek je najistaknutije.</p>
              <p>Dugme za otkazivanje koristi istu crvenu boju i istu poziciju na svim ekranima.</p>
              <p>Status “slobodan” je zelen, a “problem” ili “otkazano” su crveni.</p>
              <p>Nazivi menija su kratki, razumljivi i ponavljaju se kroz aplikaciju.</p>
            </div>
          </div>
        </section>

        <section id="vizuelna-organizacija-izlaza" className="space-y-4">
          <SectionHeading
            eyebrow="Slika za izvještaj"
            title="Vizuelna organizacija izlaza"
            description="Izlazi se organizuju kroz boje, badgeve, ikonice, highlight i kartice. Kritične informacije su izdvojene bojom, ikonom i jasnim tekstom kako bi korisnik odmah znao šta zahtijeva reakciju."
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:p-5">
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[0.28fr_0.42fr_0.3fr] bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    <div className="border-r border-slate-200 px-3 py-2.5">Vizuelni element</div>
                    <div className="border-r border-slate-200 px-3 py-2.5">Primjena</div>
                    <div className="px-3 py-2.5">Primjer</div>
                  </div>
                  {visualOutputRows.map((row) => (
                    <VisualOutputTableRow key={row.element} row={row} />
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <VisualHighlightCard />
                  <VisualRideCard />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Primjer boja</p>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-[0.34fr_0.66fr] bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      <div className="border-r border-slate-200 px-3 py-2.5">Boja</div>
                      <div className="px-3 py-2.5">Značenje</div>
                    </div>
                    {visualColorRows.map((row) => (
                      <VisualColorRow key={row.color} row={row} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Badgevi i ikonice</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-800">Novo</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">Čeka</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">Slobodan</span>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-800">Problem</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visualIconRows.map((row) => (
                      <VisualIconChip key={row.label} row={row} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="1. Organizacija ekrana"
            title="Elementi su raspoređeni prema zadatku korisnika"
            description="Svaka uloga ima drugačiji raspored, ali se struktura oslanja na isti princip: prvo se prikazuje najvažniji kontekst, zatim detalji i sljedeća akcija."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {screenOrganizationRows.map((row) => (
              <OrganizationCard key={row.role} row={row} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="2. Dugmad i akcije"
            title="Isti raspored akcija na različitim ekranima"
            description="Svaki primjer koristi isti obrazac: naslov ekrana, status, prikaz lokacije, glavna akcija i otkazivanje."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {demoScreens.map((screen) => (
              <MockScreen key={screen.title} screen={screen} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="3. Statusi"
            title="Boje statusa se ne mijenjaju između ekrana"
            description="Korisnik ne mora ponovo učiti značenje boja: zeleno znači slobodno ili uredno, crveno znači problem ili otkazivanje."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statusExamples.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={item.tone} className="rounded-md border-0 px-2 py-1">
                    {item.label}
                  </Badge>
                  <span className={cn('h-3 w-3 rounded-full', toneClasses[item.tone].line)} aria-hidden />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">{item.description}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">{item.rule}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:grid-cols-[1.1fr_0.9fr] lg:p-5">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Status / Značenje</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[0.42fr_0.58fr] bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <div className="border-r border-slate-200 px-3 py-2.5">Status</div>
                  <div className="px-3 py-2.5">Značenje</div>
                </div>
                {statusMeaningRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[0.42fr_0.58fr] border-t border-slate-100">
                    <div className="flex items-center gap-2 border-r border-slate-100 px-3 py-3">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', row.dotClassName)} aria-hidden />
                      <StatusMeaningBadge row={row} />
                    </div>
                    <p className="px-3 py-3 text-sm font-semibold leading-5 text-slate-700">{row.meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Slika: statusni badgevi</p>
              <div className="mt-4 rounded-2xl border border-white bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {statusMeaningRows.map((row) => (
                    <StatusMeaningBadge key={row.label} row={row} />
                  ))}
                </div>
                <div className="mt-5 space-y-3">
                  <StatusLegendLine label="Vozači" value="Slobodan, Zauzet, Pauza" rows={statusMeaningRows.slice(0, 4)} />
                  <StatusLegendLine label="Zahtjevi" value="Čeka dodjelu" rows={statusMeaningRows.slice(4, 5)} />
                  <StatusLegendLine label="Vožnje" value="Na vožnji, Otkazano, Završeno" rows={[statusMeaningRows[2], statusMeaningRows[5], statusMeaningRows[6]]} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <SectionHeading
              eyebrow="4. Meni"
              title="Kratki i razumljivi nazivi"
              description="Navigacija koristi iste nazive i iste ikone za iste funkcije."
            />
            <nav className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
              {menuItems.map(({ label, icon: Icon }, index) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    'flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors',
                    index === 0 ? 'bg-brand-yellow/25 text-brand-navy' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <SectionHeading
              eyebrow="5. Poruke"
              title="Isti način prikaza obavještenja"
              description="Sve poruke imaju isti raspored, a promjena boje jasno označava vrstu poruke."
            />
            <div className="space-y-3">
              {messageExamples.map((message) => (
                <MessageRow key={message.title} message={message} />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="6. Notifikacije"
            title="Sistemske notifikacije"
            description="Notifikacije koriste isti obrazac prikaza: ikona, naziv, kratko objašnjenje i ciljna uloga koja treba reagovati."
          />
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:grid-cols-[1.1fr_0.9fr] lg:p-5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[0.35fr_0.65fr] bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                <div className="border-r border-slate-200 px-3 py-2.5">Notifikacija</div>
                <div className="px-3 py-2.5">Objašnjenje</div>
              </div>
              {notificationRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[0.35fr_0.65fr] border-t border-slate-100">
                  <div className="flex items-center gap-2 border-r border-slate-100 px-3 py-3">
                    <NotificationIcon row={row} />
                    <span className="text-sm font-extrabold text-brand-navy">{row.label}</span>
                  </div>
                  <p className="px-3 py-3 text-sm font-semibold leading-5 text-slate-700">{row.explanation}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Primjer prikaza notifikacija</p>
              <div className="mt-4 space-y-3">
                {notificationRows.map((row) => (
                  <NotificationPreview key={row.label} row={row} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="7. Povratna informacija"
            title="Poruka nakon svake važne akcije"
            description="Aplikacija odmah prikazuje kratku povratnu informaciju u istom toast obrascu."
          />
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:grid-cols-[1.05fr_0.95fr] lg:p-5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[0.42fr_0.58fr] bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                <div className="border-r border-slate-200 px-3 py-2.5">Akcija</div>
                <div className="px-3 py-2.5">Povratna informacija</div>
              </div>
              {feedbackRows.map((row) => (
                <div key={row.action} className="grid grid-cols-[0.42fr_0.58fr] border-t border-slate-100">
                  <p className="border-r border-slate-100 px-3 py-3 text-sm font-extrabold leading-5 text-brand-navy">
                    {row.action}
                  </p>
                  <p className="px-3 py-3 text-sm font-semibold leading-5 text-slate-700">"{row.message}"</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Kako izgleda u aplikaciji</p>
              <div className="mt-4 space-y-3">
                {feedbackRows.map((row) => (
                  <FeedbackToastPreview key={row.action} row={row} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Zaključak</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Konzistentnost ubrzava rad korisnika</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                Kada korisnici vide iste boje, nazive, ikone i raspored akcija, brže razumiju šta sistem
                očekuje od njih. Zbog toga se smanjuje broj grešaka i vrijeme potrebno za učenje aplikacije.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ConsistencyMetric value="1x" label="učenje obrasca" />
              <ConsistencyMetric value="3" label="uloge: putnik, vozač, dispečer" />
              <ConsistencyMetric value="7" label="ponovljenih UI pravila" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-navy">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">{description}</p>
    </div>
  )
}

function EvidencePill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
      <Icon className="h-4 w-4 text-brand-teal" aria-hidden />
      {label}
    </span>
  )
}

function VisualOutputTableRow({ row }: { row: (typeof visualOutputRows)[number] }) {
  const Icon = row.icon
  return (
    <div className="grid grid-cols-[0.28fr_0.42fr_0.3fr] border-t border-slate-100">
      <div className="flex items-center gap-2 border-r border-slate-100 px-3 py-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneClasses[row.tone].icon)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-black text-brand-navy">{row.element}</span>
      </div>
      <p className="border-r border-slate-100 px-3 py-3 text-sm font-semibold leading-5 text-slate-700">{row.use}</p>
      <p className="px-3 py-3 text-sm font-bold leading-5 text-brand-navy">{row.example}</p>
    </div>
  )
}

function VisualColorRow({ row }: { row: (typeof visualColorRows)[number] }) {
  return (
    <div className="grid grid-cols-[0.34fr_0.66fr] border-t border-slate-100">
      <div className="flex items-center gap-2 border-r border-slate-100 px-3 py-3">
        <span className={cn('h-4 w-4 rounded-full shadow-sm ring-2 ring-white', row.swatch)} aria-hidden />
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-extrabold', row.badgeClass)}>{row.color}</span>
      </div>
      <p className="px-3 py-3 text-sm font-semibold leading-5 text-slate-700">{row.meaning}</p>
    </div>
  )
}

function VisualIconChip({ row }: { row: (typeof visualIconRows)[number] }) {
  const Icon = row.icon
  return (
    <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', row.className)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-xs font-extrabold text-brand-navy">{row.label}</span>
    </div>
  )
}

function VisualHighlightCard() {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-red-700">Highlight</p>
          <h3 className="mt-1 text-base font-black text-brand-navy">Konflikt dodjele</h3>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
            Vozač je već dodijeljen na drugu aktivnu vožnju.
          </p>
        </div>
      </div>
    </div>
  )
}

function VisualRideCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Kartica zahtjeva</p>
          <h3 className="mt-1 text-base font-black text-brand-navy">Baščaršija -&gt; Aerodrom</h3>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">Čeka</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-slate-500" aria-hidden />
          Putnik: Lejla H.
        </div>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-emerald-700" aria-hidden />
          Vozač: nije dodijeljen
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-amber-700" aria-hidden />
          Čeka 8 min
        </div>
      </div>
    </div>
  )
}

function OrganizationCard({ row }: { row: (typeof screenOrganizationRows)[number] }) {
  const Icon = row.icon
  return (
    <article className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow/20 text-brand-navy">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{row.role}</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-brand-navy">{row.title}</h3>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{row.description}</p>

      <div className="mt-auto pt-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <PanelTop className="h-4 w-4" aria-hidden />
            Raspored elemenata
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {row.steps.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="inline-flex min-h-[34px] items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-brand-navy shadow-sm">
                  {step}
                </span>
                {index < row.steps.length - 1 ? <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function MockScreen({ screen }: { screen: (typeof demoScreens)[number] }) {
  return (
    <article className="flex min-h-[360px] flex-col rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{screen.role}</p>
            <h3 className="mt-1 text-lg font-black tracking-tight">{screen.title}</h3>
          </div>
          <Badge variant={screen.statusTone} className="rounded-md border-0 px-2 py-1">
            {screen.status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/20 text-brand-navy">
              <Route className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ruta</p>
              <p className="mt-1 text-sm font-extrabold text-brand-navy">{screen.route}</p>
            </div>
          </div>
        </div>

        <MapLocationButton />

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <p className="text-sm font-semibold leading-5 text-slate-600">{screen.note}</p>
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
          <Button variant="cta" className="w-full">
            {screen.primaryAction}
          </Button>
          <CancelButton label={screen.cancelAction} />
        </div>
      </div>
    </article>
  )
}

function MapLocationButton() {
  return (
    <Button variant="secondary" size="sm" className="w-full justify-start rounded-xl border-slate-200 bg-white text-slate-700">
      <MapPinned className="h-4 w-4 text-brand-teal" aria-hidden />
      Prikaz lokacije
    </Button>
  )
}

function CancelButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-extrabold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
    >
      <CircleX className="h-4 w-4" aria-hidden />
      {label}
    </button>
  )
}

function MessageRow({ message }: { message: (typeof messageExamples)[number] }) {
  const Icon = message.icon
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border p-4 shadow-sm', toneClasses[message.tone].surface)}>
      <span className={cn('absolute bottom-0 left-0 top-0 w-1', toneClasses[message.tone].line)} aria-hidden />
      <div className="flex items-start gap-3 pl-2">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClasses[message.tone].icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-black text-brand-navy">{message.title}</h3>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-600">{message.text}</p>
        </div>
      </div>
    </div>
  )
}

function StatusMeaningBadge({ row }: { row: (typeof statusMeaningRows)[number] }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold leading-none', row.className)}>
      {row.label}
    </span>
  )
}

function StatusLegendLine({
  label,
  value,
  rows,
}: {
  label: string
  value: string
  rows: Array<(typeof statusMeaningRows)[number]>
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-brand-navy">{value}</p>
      </div>
      <div className="flex shrink-0 -space-x-1">
        {rows.map((row) => (
          <span
            key={row.label}
            className={cn('h-3.5 w-3.5 rounded-full border-2 border-white', row.dotClassName)}
            title={row.label}
            aria-label={row.label}
          />
        ))}
      </div>
    </div>
  )
}

function NotificationIcon({ row }: { row: (typeof notificationRows)[number] }) {
  const Icon = row.icon
  const className = row.tone === 'default' ? 'bg-brand-yellow/20 text-amber-800' : toneClasses[row.tone].icon
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', className)}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  )
}

function NotificationPreview({ row }: { row: (typeof notificationRows)[number] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <NotificationIcon row={row} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-black text-brand-navy">{row.label}</h3>
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-yellow" aria-hidden />
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{row.explanation}</p>
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{row.target}</p>
        </div>
      </div>
    </div>
  )
}

function feedbackToastSurfaceClass(tone: FeedbackTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-100/90 bg-white ring-1 ring-emerald-500/[0.06]'
    case 'error':
      return 'border-red-100/90 bg-white ring-1 ring-red-500/[0.06]'
    default:
      return 'border-[#E5E7EB] bg-[#FAFBFC] ring-1 ring-slate-900/[0.03]'
  }
}

function feedbackToastBadgeClass(tone: FeedbackTone) {
  switch (tone) {
    case 'success':
      return 'bg-emerald-50 text-emerald-600'
    case 'error':
      return 'bg-red-50 text-red-600'
    default:
      return 'bg-blue-50 text-blue-600'
  }
}

function FeedbackToastPreview({ row }: { row: (typeof feedbackRows)[number] }) {
  const Icon = row.icon
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3.5 rounded-[13px] border px-3.5 py-2.5 shadow-card',
        feedbackToastSurfaceClass(row.tone)
      )}
    >
      <span
        className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', feedbackToastBadgeClass(row.tone))}
        aria-hidden
      >
        <Icon className="h-4 w-4 stroke-[2.25]" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-brand-navy">{row.message}</p>
      <button
        type="button"
        className="group -mr-0.5 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="Zatvori"
      >
        <X className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
      </button>
    </div>
  )
}

function ConsistencyMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-2xl font-black text-brand-navy">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}
