import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Banknote,
  Bell,
  Camera,
  Car,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  Gavel,
  Headphones,
  History,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Shield,
  User,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { ProblemReportModal } from '../components/driver/ProblemReportModal'
import { AccountProfileFormFields } from '../components/settings/AccountProfileFormFields'
import { LogoutSection } from '../components/settings/LogoutSection'
import { SettingsField } from '../components/settings/SettingsField'
import { SettingsSectionCard } from '../components/settings/SettingsSectionCard'
import { SecurityFeatureRow, SecuritySettingsStack } from '../components/settings/SecuritySettingsSection'
import { SimpleModal } from '../components/settings/SimpleModal'
import { ToggleRow } from '../components/settings/ToggleRow'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { validateAccountProfile } from '../lib/accountProfileValidation'
import { DRIVER_LICENSE_SAMPLE } from '../types/domain'
import type { AccountStatus } from '../types/domain'
import { getGuestLang, setGuestLang } from '../i18n/guestLocale'
import { useDriverShiftMutations } from '../hooks/useDriverShiftMutations'
import { useDriverUi } from '../hooks/useDriverUi'
import { cn } from '../lib/utils'
import {
  defaultNotifyPrefs,
  defaultProfileExtras,
  defaultRidePrefs,
  defaultSecurityLocal,
  loadNotifyPrefs,
  loadProfileExtras,
  loadRidePrefs,
  loadSecurityLocal,
  saveNotifyPrefs,
  saveProfileExtras,
  saveRidePrefs,
  saveSecurityLocal,
} from '../lib/driverSettingsPrefs'
import { logout, updateProfile } from '../services/authApi'
import {
  driverAvailabilityLabel,
  driverConfirmGpsOffDuringShift,
  driverReportProblem,
  driverShiftSessionLabel,
  driverUpdateSettings,
  formatDurationHms,
  resetDriverDemo,
} from '../services/driverSessionApi'
import {
  getDriverAvatarUrlSync,
  getPendingAvatarRequestForDriver,
  submitDriverAvatarPending,
} from '../services/driverPhotoApi'
import { strings } from '../i18n/strings'
import { useToastStore } from '../store/notificationStore'
import type { DriverOutletContext } from '../types/appContext'

function accountStatusLabel(status: AccountStatus): string {
  const t = strings().profile.accountStatus
  return t[status as keyof typeof t] ?? status
}

function accountBadgeClass(status: AccountStatus): string {
  switch (status) {
    case 'aktivan':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'suspendovan':
    case 'blokiran':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'neaktivan':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function vehicleStatusLabel(s: string): string {
  const m: Record<string, string> = {
    dostupno: 'Dostupno',
    zauzeto: 'Zauzeto',
    van_funkcije: 'Van funkcije',
    neaktivno: 'Neaktivno',
  }
  return m[s] ?? s
}

function vehicleBadgeClass(s: string): string {
  switch (s) {
    case 'dostupno':
      return 'bg-emerald-100 text-emerald-800'
    case 'zauzeto':
      return 'bg-blue-100 text-blue-900'
    case 'van_funkcije':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function perfBadge(acceptance: number, unjustified: number): { label: string; className: string } {
  if (acceptance >= 88 && unjustified <= 1) return { label: 'Dobro', className: 'bg-emerald-100 text-emerald-800' }
  if (acceptance >= 75 && unjustified <= 3) return { label: 'Upozorenje', className: 'bg-amber-100 text-amber-900' }
  return { label: 'Potrebna pažnja', className: 'bg-red-100 text-red-800' }
}

function liveTotalShiftSeconds(ui: import('../types/domain').DriverUiState, nowMs: number): number {
  let t = ui.shiftClock.totalActiveSecondsToday
  if (ui.shiftClock.currentSessionStartedAt) {
    t += Math.floor((nowMs - new Date(ui.shiftClock.currentSessionStartedAt).getTime()) / 1000)
  }
  return t
}

export function DriverSettingsPage() {
  const { me } = useOutletContext<DriverOutletContext>()
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const { data: ui, refetch } = useDriverUi(me.account.id)
  const { startMut, pauseMut, resumeMut, endMut } = useDriverShiftMutations(me.account.id)

  const [firstName, setFirstName] = useState(me.driverProfile.firstName)
  const [lastName, setLastName] = useState(me.driverProfile.lastName)
  const [email, setEmail] = useState(me.driverProfile.email)
  const [phone, setPhone] = useState(me.driverProfile.phone)
  const [profileExtras, setProfileExtras] = useState(() => loadProfileExtras(me.account.id))
  const [profileErrors, setProfileErrors] = useState<Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'city' | 'address', string>>>({})

  const [notifyPrefs, setNotifyPrefs] = useState(() => loadNotifyPrefs(me.account.id))
  const [ridePrefs, setRidePrefs] = useState(() => loadRidePrefs(me.account.id))
  const [secLocal, setSecLocal] = useState(() => loadSecurityLocal(me.account.id))

  const [passwordModal, setPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<{ next?: string; confirm?: string }>({})
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [twoFaOpen, setTwoFaOpen] = useState(false)
  const [twoFaCode, setTwoFaCode] = useState('')

  const [docsOpen, setDocsOpen] = useState(false)
  const [vehicleDetailOpen, setVehicleDetailOpen] = useState(false)
  const [earningsOpen, setEarningsOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [gpsWarnOpen, setGpsWarnOpen] = useState(false)
  const [securityNotifyConfirmOpen, setSecurityNotifyConfirmOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const [dispatcherModal, setDispatcherModal] = useState(false)
  const [faqDriverOpen, setFaqDriverOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [techProblemOpen, setTechProblemOpen] = useState(false)
  const [passengerProblemOpen, setPassengerProblemOpen] = useState(false)
  const [rideEmergencyOpen, setRideEmergencyOpen] = useState(false)

  const [policyOpen, setPolicyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [driverRulesLegalOpen, setDriverRulesLegalOpen] = useState(false)
  const [gpsLegalOpen, setGpsLegalOpen] = useState(false)

  const [secActivityOpen, setSecActivityOpen] = useState(false)
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false)

  const [vehicleFaultOpen, setVehicleFaultOpen] = useState(false)

  const [earningsNow, setEarningsNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setEarningsNow(Date.now()), 10000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const ex = loadProfileExtras(me.account.id)
    setGuestLang(ex.appLang)
  }, [me.account.id])

  useEffect(() => {
    setFirstName(me.driverProfile.firstName)
    setLastName(me.driverProfile.lastName)
    setEmail(me.driverProfile.email)
    setPhone(me.driverProfile.phone)
    setProfileExtras(loadProfileExtras(me.account.id))
    setNotifyPrefs(loadNotifyPrefs(me.account.id))
    setRidePrefs(loadRidePrefs(me.account.id))
    setSecLocal(loadSecurityLocal(me.account.id))
  }, [me.account.id, me.driverProfile.firstName, me.driverProfile.lastName, me.driverProfile.email, me.driverProfile.phone])

  useEffect(() => {
    if (location.hash !== '#profile-account') return
    requestAnimationFrame(() => {
      document.getElementById('profile-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.pathname, location.hash])

  const linkedDriverId = me.driverProfile.linkedDriverId

  const driverAvatarQ = useQuery({
    queryKey: ['driverAvatar', linkedDriverId],
    queryFn: async () => getDriverAvatarUrlSync(linkedDriverId) ?? null,
  })

  const driverPhotoPendingQ = useQuery({
    queryKey: ['driverAvatarPending', linkedDriverId],
    queryFn: async () => getPendingAvatarRequestForDriver(linkedDriverId) ?? null,
  })

  useEffect(() => {
    const bump = () => {
      void qc.invalidateQueries({ queryKey: ['driverAvatar', linkedDriverId] })
      void qc.invalidateQueries({ queryKey: ['driverAvatarPending', linkedDriverId] })
    }
    window.addEventListener('urbanflow:driver-avatar-updated', bump)
    window.addEventListener('urbanflow:driver-avatar-pending-updated', bump)
    return () => {
      window.removeEventListener('urbanflow:driver-avatar-updated', bump)
      window.removeEventListener('urbanflow:driver-avatar-pending-updated', bump)
    }
  }, [qc, linkedDriverId])

  const saveMut = useMutation({
    mutationFn: () =>
      updateProfile(me.account.id, {
        firstName,
        lastName,
        email,
        phone,
      }),
    onSuccess: async (res) => {
      if ('error' in res) {
        push('Greška pri spremanju profila.', 'error')
        return
      }
      saveProfileExtras(me.account.id, profileExtras)
      setGuestLang(profileExtras.appLang)
      push('Profil je uspješno ažuriran.', 'success')
      await qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const resetMut = useMutation({
    mutationFn: () => resetDriverDemo(me.account.id),
    onSuccess: async () => {
      push('Podaci su vraćeni na početno stanje.', 'success')
      setResetConfirmOpen(false)
      setProfileExtras(defaultProfileExtras())
      setNotifyPrefs(defaultNotifyPrefs())
      setRidePrefs(defaultRidePrefs())
      setSecLocal(defaultSecurityLocal())
      await qc.invalidateQueries({ queryKey: ['driverUi', me.account.id] })
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['driverAvatar', linkedDriverId] })
      await qc.invalidateQueries({ queryKey: ['driverAvatarPending', linkedDriverId] })
      await refetch()
      window.dispatchEvent(new CustomEvent('urbanflow:driver-prefs-changed'))
    },
  })

  const submitDriverPhotoMut = useMutation({
    mutationFn: (dataUrl: string) =>
      submitDriverAvatarPending({
        accountId: me.account.id,
        driverId: linkedDriverId,
        dataUrl,
      }),
    onSuccess: async (res) => {
      if ('error' in res) {
        push('Slika nije validna. Pokušajte drugu datoteku.', 'error')
        return
      }
      push('Zahtjev je poslan. Nova fotografija bit će vidljiva tek nakon odobrenja administratora.', 'success')
      setPhotoOpen(false)
      await qc.invalidateQueries({ queryKey: ['driverAvatarPending', linkedDriverId] })
      await qc.invalidateQueries({ queryKey: ['adminDriverAvatarPending'] })
    },
  })

  const settingsMut = useMutation({
    mutationFn: (p: Parameters<typeof driverUpdateSettings>[1]) => driverUpdateSettings(me.account.id, p),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['driverUi', me.account.id] })
    },
  })

  const gpsOffMut = useMutation({
    mutationFn: () => driverConfirmGpsOffDuringShift(me.account.id),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('GPS isključen; smjena prekinuta.', 'success')
      setGpsWarnOpen(false)
      await qc.invalidateQueries({ queryKey: ['driverUi', me.account.id] })
    },
  })

  const reportMut = useMutation({
    mutationFn: (p: { type: Parameters<typeof driverReportProblem>[1]; description: string }) =>
      driverReportProblem(me.account.id, p.type, p.description),
    onSuccess: async () => {
      push('Kvar je prijavljen dispečerskom centru.', 'success')
      setVehicleFaultOpen(false)
      await qc.invalidateQueries({ queryKey: ['driverUi', me.account.id] })
    },
  })

  function validateProfile(): boolean {
    const next = validateAccountProfile(
      {
        firstName,
        lastName,
        email,
        phone,
        city: profileExtras.city,
        address: profileExtras.address,
      },
      getGuestLang() === 'en' ? 'en' : 'bs'
    )
    setProfileErrors(next)
    return Object.keys(next).length === 0
  }

  function onSaveProfile() {
    if (!validateProfile()) return
    saveMut.mutate()
  }

  function onDriverPhotoSelected(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      push('Odaberite sliku (JPG, PNG…).', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      push('Maksimalna veličina slike je 2 MB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) {
        push('Greška pri učitavanju slike.', 'error')
        return
      }
      submitDriverPhotoMut.mutate(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function persistNotify(next: typeof notifyPrefs) {
    setNotifyPrefs(next)
    saveNotifyPrefs(me.account.id, next)
  }

  function persistRide(next: typeof ridePrefs) {
    setRidePrefs(next)
    saveRidePrefs(me.account.id, next)
    window.dispatchEvent(new CustomEvent('urbanflow:driver-prefs-changed'))
  }

  function onGpsToggle(next: boolean) {
    if (!ui) return
    const onDuty = ['dostupan', 'zauzet', 'na_pauzi'].includes(ui.availabilityStatus)
    if (!next && onDuty) {
      setGpsWarnOpen(true)
      return
    }
    void settingsMut.mutateAsync({ gpsConsent: next }).then(() => {
      if (next) push('Pristup lokaciji uključen.', 'success')
      else push('Pristup lokaciji isključen.', 'info')
    })
  }

  const licenseLabel = useMemo(() => {
    if (!ui) return 'Valjana'
    if (ui.flags.licenseExpired || me.driverProfile.licenseStatus === 'istekla') return 'Istekla'
    if (ui.flags.licenseInReview) return 'U provjeri'
    return 'Valjana'
  }, [ui, me.driverProfile.licenseStatus])

  const perf = useMemo(() => {
    if (!ui) return null
    const rejected = ui.activityLog.filter((l) => l.message.toLowerCase().includes('odbijen')).length
    const cancelled = ui.history.filter((h) => h.status === 'otkazana').length
    const problems = ui.history.filter((h) => h.status === 'problem' || h.status === 'neuspjesna').length
    const completed = ui.history.filter((h) => h.status === 'zavrsena')
    const cashRides = completed.filter((h) => h.paymentMethod === 'gotovina').length
    const pb = perfBadge(ui.acceptanceRatePercent, ui.totalUnjustifiedCancels)
    return {
      rejected,
      cancelled,
      problems,
      cashRides,
      completedCount: completed.length,
      pb,
      avgEta: completed.length ? 6 : 6,
    }
  }, [ui])

  const earningsAgg = useMemo(() => {
    if (!ui) return { week: 0, month: 0, cashCount: 0, avgPerRide: 0 }
    const now = earningsNow
    const weekMs = 7 * 86400000
    const monthMs = 30 * 86400000
    let week = 0
    let month = 0
    let cashCount = 0
    let rideN = 0
    for (const h of ui.history) {
      if (h.status !== 'zavrsena') continue
      const t = new Date(h.date).getTime()
      const e = h.earningsBam
      if (now - t <= monthMs) month += e
      if (now - t <= weekMs) week += e
      if (h.paymentMethod === 'gotovina') cashCount += 1
      rideN += 1
    }
    week += ui.earningsTodayBam
    month += ui.earningsTodayBam
    const avgPerRide = rideN > 0 ? Math.round((month / rideN) * 100) / 100 : ui.earningsTodayBam
    return { week, month, cashCount, avgPerRide }
  }, [ui, earningsNow])

  async function onLogout() {
    await logout()
    await qc.invalidateQueries({ queryKey: ['me'] })
    navigate('/welcome', { replace: true })
  }

  if (!ui || !perf) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    )
  }

  const busy = ui.availabilityStatus === 'zauzet' && !!ui.activeRide
  const debtAmount = ui.flags.debtOwed ? DRIVER_LICENSE_SAMPLE.debtWhenOwedBam : 0
  const settlementStatus = ui.ridesToday % 2 === 0 ? 'U toku' : 'Zaključeno'

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold text-brand-navy">Postavke</h1>

      <Card className="shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <CardContent className="grid gap-4 p-6 lg:grid-cols-2">
          {/* 1 Profil */}
          <SettingsSectionCard
            id="profile-account"
            icon={User}
            title="Profil vozača"
            color="bg-slate-900/90 text-white"
            className="lg:col-span-2"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.08] bg-white p-4">
                {driverAvatarQ.data ? (
                  <img
                    src={driverAvatarQ.data}
                    alt=""
                    className="h-20 w-20 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-brand-navy">
                    {firstName.charAt(0)}
                    {lastName.charAt(0)}
                  </div>
                )}
                {driverPhotoPendingQ.data ? (
                  <Badge variant="warning" className="text-[10px]">
                    Čeka odobrenje administratora
                  </Badge>
                ) : null}
                <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => setPhotoOpen(true)}>
                  <Camera className="h-4 w-4" />
                  Promijeni fotografiju
                </Button>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <AccountProfileFormFields
                  values={{
                    firstName,
                    lastName,
                    email,
                    phone,
                    city: profileExtras.city,
                    address: profileExtras.address,
                  }}
                  errors={profileErrors}
                  onChange={(patch) => {
                    if (patch.firstName !== undefined) setFirstName(patch.firstName)
                    if (patch.lastName !== undefined) setLastName(patch.lastName)
                    if (patch.email !== undefined) setEmail(patch.email)
                    if (patch.phone !== undefined) setPhone(patch.phone)
                    if (patch.city !== undefined || patch.address !== undefined) {
                      setProfileExtras((p) => ({
                        ...p,
                        ...(patch.city !== undefined ? { city: patch.city } : {}),
                        ...(patch.address !== undefined ? { address: patch.address } : {}),
                      }))
                    }
                  }}
                  labels={{
                    firstName: 'Ime',
                    lastName: 'Prezime',
                    email: 'E-mail',
                    phone: 'Broj telefona',
                    city: 'Grad',
                    address: 'Adresa (opcionalno)',
                  }}
                  afterFields={
                    <div className="flex flex-col gap-1">
                      <Label>Jezik aplikacije</Label>
                      <select
                        className="h-11 w-full max-w-md rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
                        value={profileExtras.appLang}
                        onChange={(e) =>
                          setProfileExtras((p) => ({ ...p, appLang: e.target.value as 'bs' | 'en' }))
                        }
                      >
                        <option value="bs">Bosanski</option>
                        <option value="en">English</option>
                      </select>
                      <p className="text-xs leading-snug text-slate-500">
                        Jezik aplikacije koristi se za prikaz interfejsa i obavještenja.
                      </p>
                    </div>
                  }
                />
              </div>
            </div>
            <Button type="button" onClick={onSaveProfile} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Spremi promjene
            </Button>
          </SettingsSectionCard>

          {/* 2 Status naloga */}
          <SettingsSectionCard icon={Shield} title="Status naloga i ograničenja" color="bg-slate-700 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-brand-navy">Status računa:</span>
              <Badge className={cn('rounded-full border', accountBadgeClass(me.account.status))}>
                {accountStatusLabel(me.account.status)}
              </Badge>
              {ui.flags.accountSuspended ? (
                <Badge className="rounded-full bg-red-100 text-red-800">Suspendovan nalog</Badge>
              ) : null}
              {ui.flags.licenseExpired ? (
                <Badge className="rounded-full bg-red-100 text-red-800">Istekla licenca</Badge>
              ) : null}
              {ui.flags.debtOwed ? (
                <Badge className="rounded-full bg-amber-100 text-amber-900">Dug prema firmi</Badge>
              ) : null}
              {ui.flags.gpsUnavailableSim ? (
                <Badge className="rounded-full bg-amber-100 text-amber-900">GPS greška</Badge>
              ) : null}
            </div>
            <p className="text-sm text-slate-600">Ograničenja postavlja administracija sistema.</p>
          </SettingsSectionCard>

          {/* 3 Licenca */}
          <SettingsSectionCard icon={FileText} title="Licenca i dokumenti" color="bg-violet-600 text-white">
            <div className="grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Broj licence:</span> {DRIVER_LICENSE_SAMPLE.number}
              </p>
              <p>
                <span className="font-semibold">Status licence:</span>{' '}
                <span
                  className={cn(
                    'font-semibold',
                    licenseLabel === 'Istekla' ? 'text-red-700' : licenseLabel === 'U provjeri' ? 'text-amber-700' : 'text-emerald-700'
                  )}
                >
                  {licenseLabel}
                </span>
              </p>
              <p>
                <span className="font-semibold">Datum izdavanja:</span>{' '}
                {new Date(DRIVER_LICENSE_SAMPLE.issuedIso).toLocaleDateString('bs-BA')}
              </p>
              <p>
                <span className="font-semibold">Datum isteka:</span>{' '}
                {new Date(DRIVER_LICENSE_SAMPLE.expiresIso).toLocaleDateString('bs-BA')}
              </p>
              <p>
                <span className="font-semibold">Verifikacija identiteta:</span>{' '}
                <span className="text-emerald-700 font-medium">Verifikovan</span>
              </p>
              <p>
                <span className="font-semibold">Ljekarsko uvjerenje:</span>{' '}
                <span className="text-emerald-700 font-medium">Valjano</span>
              </p>
              <p>
                <span className="font-semibold">Status dokumentacije:</span>{' '}
                <span className="text-emerald-700 font-medium">Kompletna</span>
              </p>
              <p>
                <span className="font-semibold">Dug prema firmi:</span>{' '}
                {debtAmount.toFixed(2)} BAM
              </p>
            </div>
            {ui.flags.debtOwed ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                Upozorenje: evidentiran je dug prema firmi. Riješite saldo prije početka smjene.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setDocsOpen(true)}>
                Prikaži dokumente
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => push('Zahtjev za obnovu licence je poslan administraciji.', 'success')}
              >
                Zatraži obnovu licence
              </Button>
            </div>
          </SettingsSectionCard>

          {/* 4 Vozilo */}
          <SettingsSectionCard icon={Car} title="Vozilo" color="bg-cyan-700 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Marka i model:</span> {ui.vehicleUi.brandModel}
              </p>
              <Badge className={cn('rounded-full border-0', vehicleBadgeClass(ui.vehicleUi.status))}>
                {vehicleStatusLabel(ui.vehicleUi.status)}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="font-semibold">Boja:</span> {ui.vehicleUi.color}
              </p>
              <p>
                <span className="font-semibold">Registracija:</span> {ui.vehicleUi.plate}
              </p>
              <p>
                <span className="font-semibold">Godina:</span> {ui.vehicleUi.year}
              </p>
              <p>
                <span className="font-semibold">Sjedišta:</span> {ui.vehicleUi.seatCount}
              </p>
              <p>
                <span className="font-semibold">Tip:</span> {ui.vehicleUi.vehicleType}
              </p>
              <p>
                <span className="font-semibold">Procjena goriva:</span> {ui.fuelPercent}%
              </p>
              <p>
                <span className="font-semibold">Zadnji tehnički:</span>{' '}
                {new Date(ui.vehicleUi.lastInspectionIso).toLocaleDateString('bs-BA')}
              </p>
              <p>
                <span className="font-semibold">Sljedeći tehnički:</span>{' '}
                {new Date(ui.vehicleUi.nextInspectionIso).toLocaleDateString('bs-BA')}
              </p>
              <p className="sm:col-span-2">
                <span className="font-semibold">Osiguranje važi do:</span>{' '}
                {new Date(ui.vehicleUi.insuranceUntilIso).toLocaleDateString('bs-BA')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="gap-1" onClick={() => setVehicleFaultOpen(true)}>
                <Wrench className="h-4 w-4" />
                Prijavi kvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setVehicleDetailOpen(true)
                  push('Detalji vozila su prikazani.', 'success')
                }}
              >
                Prikaži detalje vozila
              </Button>
            </div>
          </SettingsSectionCard>

          {/* 5 Smjena */}
          <SettingsSectionCard icon={Clock3} title="Smjena i dostupnost" color="bg-amber-500 text-brand-navy">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="font-semibold">Status vozača:</span> {driverAvailabilityLabel(ui.availabilityStatus)}
              </p>
              <p>
                <span className="font-semibold">Status smjene:</span> {driverShiftSessionLabel(ui)}
              </p>
              <p>
                <span className="font-semibold">Početak smjene:</span>{' '}
                {ui.shiftClock.currentSessionStartedAt
                  ? new Date(ui.shiftClock.currentSessionStartedAt).toLocaleString('bs-BA')
                  : ui.shiftClock.lastSessionStartedAt
                    ? new Date(ui.shiftClock.lastSessionStartedAt).toLocaleString('bs-BA')
                    : '—'}
              </p>
              <p>
                <span className="font-semibold">Završetak smjene:</span>{' '}
                {ui.shiftClock.lastSessionEndedAt
                  ? new Date(ui.shiftClock.lastSessionEndedAt).toLocaleString('bs-BA')
                  : '—'}
              </p>
              <p>
                <span className="font-semibold">Trajanje smjene danas:</span>{' '}
                {formatDurationHms(liveTotalShiftSeconds(ui, earningsNow))}
              </p>
              <p>
                <span className="font-semibold">Pauze danas:</span> {ui.shiftClock.pausesToday}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-3">
              {ui.availabilityStatus === 'van_smjene' ? (
                <Button className="min-h-11" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
                  Započni smjenu
                </Button>
              ) : null}
              {ui.availabilityStatus === 'dostupan' ? (
                <>
                  <Button
                    variant="secondary"
                    className="min-h-11 border-amber-400/85 bg-amber-100 text-amber-950 shadow-sm hover:border-amber-500 hover:bg-amber-200/90 hover:text-amber-950"
                    onClick={() => pauseMut.mutate()}
                    disabled={pauseMut.isPending}
                  >
                    Pauza
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => endMut.mutate()}
                    disabled={endMut.isPending || busy}
                  >
                    Završi smjenu
                  </Button>
                </>
              ) : null}
              {ui.availabilityStatus === 'na_pauzi' ? (
                <>
                  <Button className="min-h-11" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
                    Nastavi
                  </Button>
                  <Button variant="outline" className="min-h-11" onClick={() => endMut.mutate()} disabled={endMut.isPending}>
                    Završi smjenu
                  </Button>
                </>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              Dugmad koriste istu logiku kao na kontrolnoj tabli; status se odmah sinkronizuje u zaglavlju i kartici statusa.
            </p>
          </SettingsSectionCard>

          {/* 6 GPS */}
          <SettingsSectionCard icon={MapPin} title="GPS i privatnost" color="bg-teal-700 text-white">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">GPS je potreban za aktivnu smjenu.</span>{' '}
              Lokacija se koristi za dodjelu vožnji, praćenje i sigurnost.
            </p>
            <button
              type="button"
              className="text-left text-sm font-semibold text-blue-800 underline decoration-blue-400 underline-offset-2 hover:text-blue-950"
              onClick={() => setPolicyOpen(true)}
            >
              Politika privatnosti
            </button>
            <ToggleRow
              title="Pristup GPS lokaciji"
              description="Potrebno za smjenu i dodjelu vožnji. Bez GPS-a ne možete biti dostupni."
              enabled={ui.settings.gpsConsent}
              onChange={onGpsToggle}
            />
            {ui.flags.gpsUnavailableSim ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                GPS lokacija trenutno nije dostupna. Ne možete postati dostupni dok se problem ne otkloni.
              </p>
            ) : null}
            <ToggleRow
              title="Dijeljenje lokacije tokom smjene"
              description="Lokacija se koristi za dodjelu vožnji, praćenje i sigurnost."
              enabled={ui.settings.shareLocationDuringShift}
              onChange={(v) => void settingsMut.mutateAsync({ shareLocationDuringShift: v })}
            />
            <ToggleRow
              title="Slanje lokacije dispečeru"
              description="Dispečerski centar prima vašu lokaciju radi koordinacije."
              enabled={ui.settings.shareLocationWithDispatcher}
              onChange={(v) => void settingsMut.mutateAsync({ shareLocationWithDispatcher: v })}
            />
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Obrada GPS podataka:</span> GPS podaci se čuvaju samo koliko je nužno za izvršenje vožnje.
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Zadnja poznata lokacija:</span> {ui.settings.lastKnownLocationLabel}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Zadnje GPS očitanje:</span>{' '}
              {ui.settings.lastGpsReadAt
                ? new Date(ui.settings.lastGpsReadAt).toLocaleString('bs-BA')
                : '—'}
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setGpsLegalOpen(true)}>
              Obrada GPS podataka
            </Button>
          </SettingsSectionCard>

          {/* 7 Notifikacije */}
          <SettingsSectionCard icon={Bell} title="Obavještenja" color="bg-emerald-600 text-white">
            <ToggleRow
              title="Email obavještenja"
              description="Važne poruke i sažeci na e-mail."
              enabled={notifyPrefs.email}
              onChange={(v) => persistNotify({ ...notifyPrefs, email: v })}
            />
            <ToggleRow
              title="Push obavještenja"
              description="Brza obavještenja na uređaju."
              enabled={notifyPrefs.push}
              onChange={(v) => persistNotify({ ...notifyPrefs, push: v })}
            />
            <ToggleRow
              title="Sigurnosna obavještenja"
              description="Preporučeno: prijave, lozinka i sigurnosni događaji."
              enabled={notifyPrefs.security}
              recommended
              recommendedLabel="Preporučeno"
              onChange={(v) => {
                if (!v) {
                  setSecurityNotifyConfirmOpen(true)
                  return
                }
                persistNotify({ ...notifyPrefs, security: true })
              }}
            />
            <ToggleRow
              title="Novi zahtjevi za vožnju"
              description="Obavještenja o novim ponudama vožnje."
              enabled={notifyPrefs.newRideRequests}
              onChange={(v) => persistNotify({ ...notifyPrefs, newRideRequests: v })}
            />
            {!notifyPrefs.newRideRequests ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Zahtjeve i dalje vidite u aplikaciji; push i e-mail za nove zahtjeve su isključeni.
              </p>
            ) : null}
            <ToggleRow
              title="Promjene dodjele"
              description="Kada sistem promijeni dodjelu vožnje."
              enabled={notifyPrefs.assignmentChanges}
              onChange={(v) => persistNotify({ ...notifyPrefs, assignmentChanges: v })}
            />
            <ToggleRow
              title="Poruke dispečera"
              enabled={notifyPrefs.dispatcherMessages}
              onChange={(v) => persistNotify({ ...notifyPrefs, dispatcherMessages: v })}
              description="Obavještenja od dispečerskog centra."
            />
            <ToggleRow
              title="Upozorenja o dokumentima"
              enabled={notifyPrefs.docAlerts}
              onChange={(v) => persistNotify({ ...notifyPrefs, docAlerts: v })}
              description="Licenca, osiguranje i rokovi."
            />
            <ToggleRow
              title="Upozorenja o smjeni"
              enabled={notifyPrefs.shiftAlerts}
              onChange={(v) => persistNotify({ ...notifyPrefs, shiftAlerts: v })}
              description="Pauza, završetak smjene, status."
            />
            <ToggleRow
              title="Obavještenja o zaradi"
              enabled={notifyPrefs.earningsAlerts}
              onChange={(v) => persistNotify({ ...notifyPrefs, earningsAlerts: v })}
              description="Sažeci zarade i obračuna."
            />
          </SettingsSectionCard>

          {/* 8 Preferencije */}
          <SettingsSectionCard icon={Navigation} title="Preferencije vožnji" color="bg-indigo-600 text-white">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Zadani tip vožnje</Label>
                <select
                  className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
                  value={ridePrefs.defaultRideType}
                  onChange={(e) =>
                    persistRide({ ...ridePrefs, defaultRideType: e.target.value as typeof ridePrefs.defaultRideType })
                  }
                >
                  <option value="odmah">Odmah</option>
                  <option value="zakazane">Zakazane</option>
                  <option value="obje">Obje vrste</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Maks. udaljenost do putnika</Label>
                <select
                  className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
                  value={ridePrefs.maxDistanceKm}
                  onChange={(e) =>
                    persistRide({ ...ridePrefs, maxDistanceKm: Number(e.target.value) as 1 | 3 | 5 | 10 })
                  }
                >
                  <option value={1}>1 km</option>
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Preferirana zona</Label>
                <select
                  className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
                  value={ridePrefs.preferredZone}
                  onChange={(e) =>
                    persistRide({
                      ...ridePrefs,
                      preferredZone: e.target.value as typeof ridePrefs.preferredZone,
                    })
                  }
                >
                  <option value="centar">Sarajevo centar</option>
                  <option value="novo">Novo Sarajevo</option>
                  <option value="ilidza">Ilidža</option>
                  <option value="aerodrom">Aerodrom</option>
                  <option value="sve">Sve zone</option>
                </select>
              </div>
            </div>
            <ToggleRow
              title="Prihvataj zakazane vožnje"
              enabled={ridePrefs.acceptScheduled}
              onChange={(v) => persistRide({ ...ridePrefs, acceptScheduled: v })}
              description="Kada je uključeno, prikazuju se i zakazane ponude u skladu s pravilima dispečera."
            />
            <ToggleRow
              title="Automatski otvori navigaciju nakon prihvatanja"
              enabled={ridePrefs.autoNav}
              onChange={(v) => persistRide({ ...ridePrefs, autoNav: v })}
              description="Nakon prihvatanja vožnje otvara se navigacija na uređaju, ako je podržano."
            />
            <ToggleRow
              title="Zvuk za novi zahtjev"
              enabled={ridePrefs.soundNewRequest}
              onChange={(v) => persistRide({ ...ridePrefs, soundNewRequest: v })}
              description="Zvučno upozorenje za nove zahtjeve."
            />
          </SettingsSectionCard>

          {/* Personalizacija */}
          <SettingsSectionCard icon={Globe2} title="Personalizacija" color="bg-sky-600 text-white">
            <p className="text-sm text-slate-700">Jezik aplikacije koristi se za prikaz interfejsa i obavještenja. Podesite ga u odjeljku profila iznad.</p>
          </SettingsSectionCard>

          {/* 9 Zarada */}
          <SettingsSectionCard icon={Banknote} title="Zarada i isplata" color="bg-lime-700 text-white">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="font-semibold">Zarada danas:</span> {ui.earningsTodayBam.toFixed(2)} BAM
              </p>
              <p>
                <span className="font-semibold">Ova sedmica:</span> {earningsAgg.week.toFixed(2)} BAM
              </p>
              <p>
                <span className="font-semibold">Ovaj mjesec:</span> {earningsAgg.month.toFixed(2)} BAM
              </p>
              <p>
                <span className="font-semibold">Gotovinske vožnje (historija):</span> {perf.cashRides}
              </p>
              <p>
                <span className="font-semibold">Prosjek po vožnji (mjesec):</span> {earningsAgg.avgPerRide.toFixed(2)} BAM
              </p>
              <p>
                <span className="font-semibold">Način plaćanja:</span> Gotovina
              </p>
              <p className="sm:col-span-2 text-xs text-slate-600">Trenutno je podržano gotovinsko plaćanje.</p>
              <p>
                <span className="font-semibold">Status obračuna:</span> {settlementStatus}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEarningsOpen(true)
                  push('Obračun je prikazan.', 'success')
                }}
              >
                Prikaži obračun
              </Button>
              <Button type="button" variant="outline" onClick={() => push('Potvrda je pripremljena.', 'success')}>
                Preuzmi potvrdu
              </Button>
            </div>
          </SettingsSectionCard>

          {/* 10 Performanse */}
          <SettingsSectionCard icon={Activity} title="Performanse vozača" color="bg-orange-600 text-white">
            <div className="flex flex-wrap gap-2">
              <Badge className={cn('rounded-full border-0', perf.pb.className)}>{perf.pb.label}</Badge>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="font-semibold">Prosječna ocjena:</span> {me.driverProfile.rating.toFixed(1)}
              </p>
              <p>
                <span className="font-semibold">Ukupno vožnji (profil):</span> {me.driverProfile.totalRides}
              </p>
              <p>
                <span className="font-semibold">Stopa prihvatanja:</span> {ui.acceptanceRatePercent}%
              </p>
              <p>
                <span className="font-semibold">Odbijeni zahtjevi (log):</span> {perf.rejected}
              </p>
              <p>
                <span className="font-semibold">Otkazivanja (historija):</span> {perf.cancelled}
              </p>
              <p>
                <span className="font-semibold">Problematične vožnje:</span> {perf.problems}
              </p>
              <p>
                <span className="font-semibold">Prosječno vrijeme dolaska:</span> ~{perf.avgEta} min
              </p>
            </div>
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Savjet: održavajte visoku stopu prihvatanja i pravovremeno reagujte na poruke dispečera.
            </p>
          </SettingsSectionCard>

          {/* 11 Sigurnost */}
          <SettingsSectionCard icon={Shield} title="Sigurnost" color="bg-blue-800 text-white">
            <SecuritySettingsStack>
              <SecurityFeatureRow
                title="Promjena lozinke"
                description="Ažurirajte sigurnosne postavke računa."
                action={
                  <Button type="button" variant="secondary" onClick={() => setPasswordModal(true)}>
                    Promijeni lozinku
                  </Button>
                }
              />
              <SecurityFeatureRow
                title="Dvofaktorska autentifikacija"
                description={
                  secLocal.twoFactorEnabled
                    ? 'Dvofaktorska autentifikacija dodatno štiti vaš nalog.'
                    : 'Dvofaktorska autentifikacija dodatno štiti vaš nalog. Trenutno nije aktivirana.'
                }
                action={
                  <Button type="button" variant="secondary" onClick={() => setTwoFaOpen(true)}>
                    Upravljanje 2FA
                  </Button>
                }
              />
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-brand-navy">Zadnja prijava:</span>{' '}
                  {me.account.lastLoginAt ? new Date(me.account.lastLoginAt).toLocaleString('bs-BA') : '—'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-brand-navy">Aktivne sesije:</span> ovaj uređaj
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-brand-navy">Automatska odjava:</span> nakon 8 sati neaktivnosti.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLogoutAllConfirmOpen(true)}>
                    Odjavi se sa svih uređaja
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSecActivityOpen(true)}>
                    Pregled sigurnosnih aktivnosti
                  </Button>
                </div>
              </div>
            </SecuritySettingsStack>
          </SettingsSectionCard>

          {/* 12 Podrška */}
          <SettingsSectionCard icon={Headphones} title="Podrška" color="bg-red-600 text-white">
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-brand-navy">Dispečerska podrška</p>
              <p className="mt-2">Telefon, e-mail i hitna linija tokom vožnje dostupni su u modalima ispod.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setDispatcherModal(true)}>
                Kontakt dispečera <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setRideEmergencyOpen(true)}>
                Hitna podrška tokom vožnje <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setTechProblemOpen(true)}>
                Prijavi tehnički problem <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="justify-between"
                onClick={() => setPassengerProblemOpen(true)}
              >
                Prijavi problem sa putnikom <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setFaqDriverOpen(true)}>
                Česta pitanja za vozače <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setRulesOpen(true)}>
                Pravila ponašanja vozača <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </SettingsSectionCard>

          {/* 13 Pravne */}
          <SettingsSectionCard icon={Gavel} title="Pravne informacije" color="bg-violet-700 text-white">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setPolicyOpen(true)}>
                Politika privatnosti <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setTermsOpen(true)}>
                Uslovi korištenja <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="justify-between"
                onClick={() => setDriverRulesLegalOpen(true)}
              >
                Pravila za vozače <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="justify-between" onClick={() => setGpsLegalOpen(true)}>
                Obrada GPS podataka <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-slate-600">Verzija aplikacije: v1.0.0</p>
          </SettingsSectionCard>

          {/* 14 Reset */}
          <SettingsSectionCard icon={History} title="Vrati početno stanje" color="bg-slate-600 text-white" className="lg:col-span-2">
            <p className="text-sm text-slate-700">
              Vraća početne postavke računa, vožnji, zarade i evidencije aktivnosti za ovog korisnika na ovom uređaju.
            </p>
            <Button type="button" variant="danger" onClick={() => setResetConfirmOpen(true)} disabled={resetMut.isPending}>
              Vrati početno stanje
            </Button>
          </SettingsSectionCard>

          <div className="lg:col-span-2">
            <LogoutSection
              title="Odjava"
              description="Odjavite se sa ovog uređaja."
              onLogout={() => void onLogout()}
              ctaLabel="Odjavi se"
              icon={<LogOut className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <SimpleModal open={photoOpen} onClose={() => setPhotoOpen(false)} title="Profilna fotografija" closeLabel="Zatvori">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Učitajte novu sliku. Zbog sigurnosti i kvaliteta usluge, <strong>svaka promjena mora biti odobrena od strane
            administratora</strong> prije nego što postane vidljiva putnicima.
          </p>
          <p className="text-xs text-slate-500">
            Dozvoljene su slike do 2 MB. Neprikladne slike biće odbijene; dobit ćete obavještenje u aplikaciji.
          </p>
          <div>
            <Label htmlFor="driver-photo-upload">Odaberi sliku</Label>
            <Input
              id="driver-photo-upload"
              type="file"
              accept="image/*"
              className="mt-1 cursor-pointer"
              disabled={submitDriverPhotoMut.isPending}
              onChange={(e) => onDriverPhotoSelected(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          variant="secondary"
          disabled={submitDriverPhotoMut.isPending}
          onClick={() => setPhotoOpen(false)}
        >
          Zatvori
        </Button>
      </SimpleModal>

      <SimpleModal
        open={gpsWarnOpen}
        onClose={() => setGpsWarnOpen(false)}
        title="GPS i aktivna smjena"
        closeLabel="Otkaži"
      >
        <p className="text-sm text-slate-700">
          GPS je potreban za aktivnu smjenu. Gašenje GPS-a može vas učiniti nedostupnim i prekinuti smjenu.
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={() => setGpsWarnOpen(false)}>
            Odustani
          </Button>
          <Button className="flex-1" variant="danger" onClick={() => gpsOffMut.mutate()} disabled={gpsOffMut.isPending}>
            Potvrdi gašenje
          </Button>
        </div>
      </SimpleModal>

      <SimpleModal
        open={securityNotifyConfirmOpen}
        onClose={() => setSecurityNotifyConfirmOpen(false)}
        title="Sigurnosna obavještenja"
        closeLabel="Zatvori"
      >
        <p className="text-sm text-slate-700">
          Isključivanje sigurnosnih obavještenja nije preporučeno. Želite li nastaviti?
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={() => setSecurityNotifyConfirmOpen(false)}>
            Otkaži
          </Button>
          <Button
            className="flex-1"
            variant="danger"
            onClick={() => {
              persistNotify({ ...notifyPrefs, security: false })
              setSecurityNotifyConfirmOpen(false)
            }}
          >
            Isključi
          </Button>
        </div>
      </SimpleModal>

      <SimpleModal open={docsOpen} onClose={() => setDocsOpen(false)} title="Dokumenti" closeLabel="Zatvori">
        <p className="mb-3 text-sm text-slate-600">Dokumenti su dostupni za pregled.</p>
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
          <li>Vozačka dozvola</li>
          <li>Taksi licenca</li>
          <li>Ljekarsko uvjerenje</li>
          <li>Potvrda o nekažnjavanju</li>
        </ul>
      </SimpleModal>

      <SimpleModal open={vehicleDetailOpen} onClose={() => setVehicleDetailOpen(false)} title="Detalji vozila" closeLabel="Zatvori">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="text-slate-600">Detalji vozila su prikazani.</p>
          <p>
            <span className="font-semibold">VIN:</span> VF1ABC00000000000
          </p>
          <p>
            <span className="font-semibold">Boja:</span> {ui.vehicleUi.color}
          </p>
          <p>
            <span className="font-semibold">Snaga:</span> 97 kW
          </p>
          <p>
            <span className="font-semibold">Napomena:</span> Redovno održavanje prema servisnoj knjižici.
          </p>
        </div>
      </SimpleModal>

      <SimpleModal open={earningsOpen} onClose={() => setEarningsOpen(false)} title="Obračun zarade" closeLabel="Zatvori">
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Broj vožnji danas:</span> {ui.ridesToday}
          </p>
          <p>
            <span className="font-semibold">Bruto iznos:</span> {(ui.earningsTodayBam * 1.08).toFixed(2)} BAM
          </p>
          <p>
            <span className="font-semibold">Provizija (12%):</span> {(ui.earningsTodayBam * 0.12).toFixed(2)} BAM
          </p>
          <p>
            <span className="font-semibold">Neto iznos:</span> {ui.earningsTodayBam.toFixed(2)} BAM
          </p>
          <p>
            <span className="font-semibold">Gotovina:</span> {ui.earningsTodayBam.toFixed(2)} BAM
          </p>
        </div>
      </SimpleModal>

      <SimpleModal open={passwordModal} onClose={() => setPasswordModal(false)} title="Promjena lozinke" closeLabel="Zatvori">
        <div className="space-y-3">
          <SettingsField
            label="Trenutna lozinka"
            value={passwordForm.current}
            onChange={(v) => setPasswordForm((p) => ({ ...p, current: v }))}
            type="password"
          />
          <SettingsField
            label="Nova lozinka"
            value={passwordForm.next}
            onChange={(v) => setPasswordForm((p) => ({ ...p, next: v }))}
            type="password"
            error={passwordErrors.next}
          />
          <SettingsField
            label="Potvrda nove lozinke"
            value={passwordForm.confirm}
            onChange={(v) => setPasswordForm((p) => ({ ...p, confirm: v }))}
            type="password"
            error={passwordErrors.confirm}
          />
          <Button
            className="w-full"
            onClick={() => {
              const e: { next?: string; confirm?: string } = {}
              if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
                push('Sva polja su obavezna.', 'error')
                return
              }
              if (passwordForm.next.length < 8) e.next = 'Minimalno 8 karaktera.'
              if (passwordForm.next !== passwordForm.confirm) e.confirm = 'Potvrda se ne poklapa.'
              setPasswordErrors(e)
              if (Object.keys(e).length) return
              setPasswordLoading(true)
              window.setTimeout(() => {
                setPasswordLoading(false)
                setPasswordModal(false)
                setPasswordForm({ current: '', next: '', confirm: '' })
                push('Lozinka je uspješno ažurirana.', 'success')
              }, 600)
            }}
            disabled={passwordLoading}
          >
            {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sačuvaj
          </Button>
        </div>
      </SimpleModal>

      <SimpleModal open={twoFaOpen} onClose={() => setTwoFaOpen(false)} title="Dvofaktorska autentifikacija" closeLabel="Zatvori">
        <p className="text-sm text-slate-600">
          Unesite kod iz autentifikacijske aplikacije ili koristite kod za aktivaciju:{' '}
          <span className="font-mono font-bold">482910</span>
        </p>
        <div className="mt-3 space-y-2">
          <Label htmlFor="twofa">Kod</Label>
          <Input
            id="twofa"
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            className="bg-white"
            maxLength={6}
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            onClick={() => {
              if (twoFaCode !== '482910') {
                push('Neispravan kod.', 'error')
                return
              }
              const next = { twoFactorEnabled: true }
              saveSecurityLocal(me.account.id, next)
              setSecLocal(next)
              setTwoFaOpen(false)
              setTwoFaCode('')
              push('Dvofaktorska autentifikacija je aktivirana.', 'success')
            }}
          >
            Aktiviraj
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const next = { twoFactorEnabled: false }
              saveSecurityLocal(me.account.id, next)
              setSecLocal(next)
              setTwoFaOpen(false)
              push('2FA isključena.', 'info')
            }}
          >
            Deaktiviraj
          </Button>
        </div>
      </SimpleModal>

      <SimpleModal open={dispatcherModal} onClose={() => setDispatcherModal(false)} title="Kontakt dispečera" closeLabel="Zatvori">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-medium text-brand-navy">Dispečerski centar: +387 61 000 111, dispecer@urbanflow.ba</p>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-cyan-700" />
            +387 61 000 111
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-700" />
            dispecer@urbanflow.ba
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-600" />
            00:00–24:00
          </div>
        </div>
      </SimpleModal>

      <SimpleModal open={faqDriverOpen} onClose={() => setFaqDriverOpen(false)} title="Česta pitanja (vozači)" closeLabel="Zatvori">
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-brand-navy">Kako prijaviti kvar?</p>
            <p>Koristite Postavke → Vozilo → Prijavi kvar ili formu za tehnički problem.</p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy">Šta ako istekne licenca?</p>
            <p>Sistem blokira početak smjene dok se dokumenti ne obnove.</p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy">Kako funkcioniše GPS?</p>
            <p>Lokacija je potrebna za dodjelu i sigurnost; detalji su u politici privatnosti.</p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy">Gdje vidim zaradu?</p>
            <p>Zarada danas i historija dostupni su na kontrolnoj tabli i u ovom odjeljku.</p>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Pravila ponašanja" closeLabel="Zatvori">
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
          <li>Profesionalno ponašanje prema putnicima.</li>
          <li>Poštovanje saobraćajnih propisa.</li>
          <li>Redovna vozila i čistoća enterijera.</li>
          <li>Blagovremena komunikacija sa dispečerom u problemima.</li>
        </ul>
      </SimpleModal>

      <SimpleModal open={rideEmergencyOpen} onClose={() => setRideEmergencyOpen(false)} title="Hitna podrška" closeLabel="Zatvori">
        <p className="text-sm text-slate-700">
          Tokom vožnje pozovite +387 61 000 111 i naznačite da ste u aktivnoj vožnji. Dispečer ima prioritet za hitne
          slučajeve.
        </p>
      </SimpleModal>

      <SimpleModal open={techProblemOpen} onClose={() => setTechProblemOpen(false)} title="Tehnički problem" closeLabel="Zatvori">
        <p className="text-sm text-slate-600">Opišite problem i pošaljite prijavu podršci.</p>
        <Button className="mt-4 w-full" onClick={() => { setTechProblemOpen(false); setVehicleFaultOpen(true) }}>
          Nastavi na formu
        </Button>
      </SimpleModal>

      <SimpleModal
        open={passengerProblemOpen}
        onClose={() => setPassengerProblemOpen(false)}
        title="Problem sa putnikom"
        closeLabel="Zatvori"
      >
        <p className="text-sm text-slate-700">
          Kontaktirajte dispečera ili koristite formu problema u aktivnoj vožnji.
        </p>
        <Button
          className="mt-4 w-full"
          variant="secondary"
          onClick={() => {
            setPassengerProblemOpen(false)
            push('Prijava je poslana podršci.', 'success')
          }}
        >
          Pošalji prijavu
        </Button>
      </SimpleModal>

      <SimpleModal open={policyOpen} onClose={() => setPolicyOpen(false)} title="Politika privatnosti" closeLabel="Zatvori">
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          <p>
            GPS podaci se koriste za dodjelu vožnji, praćenje tokom smjene i sigurnost putnika i vozača. Ne dijelimo ih u
            marketinške svrhe.
          </p>
          <p>GPS podaci se ne čuvaju duže nego što je nužno za izvršenje vožnje i zakonske obaveze.</p>
        </div>
      </SimpleModal>

      <SimpleModal open={termsOpen} onClose={() => setTermsOpen(false)} title="Uslovi korištenja" closeLabel="Zatvori">
        <p className="text-sm text-slate-700">
          Korištenjem aplikacije prihvatate pravila platforme, način obračuna i procedure u slučaju spora.
        </p>
      </SimpleModal>

      <SimpleModal open={driverRulesLegalOpen} onClose={() => setDriverRulesLegalOpen(false)} title="Pravila za vozače" closeLabel="Zatvori">
        <p className="text-sm text-slate-700">
          Vozači moraju imati važeću licencu, osiguranje i tehnički ispravno vozilo. Kršenje pravila može rezultirati
          suspendovanjem naloga.
        </p>
      </SimpleModal>

      <SimpleModal open={gpsLegalOpen} onClose={() => setGpsLegalOpen(false)} title="Obrada GPS podataka" closeLabel="Zatvori">
        <p className="text-sm text-slate-700">
          Lokacija se obrađuje radi dodjele, navigacije i sigurnosti. Zadržavanje je minimalno i u skladu s politikom privatnosti.
        </p>
      </SimpleModal>

      <SimpleModal open={secActivityOpen} onClose={() => setSecActivityOpen(false)} title="Sigurnosne aktivnosti" closeLabel="Zatvori">
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex justify-between border-b border-slate-100 pb-1">
            <span>Prijava</span>
            <span className="text-slate-500">{new Date().toLocaleDateString('bs-BA')}</span>
          </li>
          <li className="flex justify-between border-b border-slate-100 pb-1">
            <span>Odjava</span>
            <span className="text-slate-500">—</span>
          </li>
          <li className="flex justify-between border-b border-slate-100 pb-1">
            <span>Promjena lozinke</span>
            <span className="text-slate-500">—</span>
          </li>
          <li className="flex justify-between pb-1">
            <span>Promjena statusa</span>
            <span className="text-slate-500">Aktivna smjena</span>
          </li>
        </ul>
      </SimpleModal>

      <SimpleModal open={logoutAllConfirmOpen} onClose={() => setLogoutAllConfirmOpen(false)} title="Odjava sa svih uređaja" closeLabel="Otkaži">
        <p className="text-sm text-slate-700">Odjavit ćete sve ostale sesije na drugim uređajima. Nastaviti?</p>
        <Button
          className="mt-4 w-full"
          variant="danger"
          onClick={() => {
            setLogoutAllConfirmOpen(false)
            push('Odjavljeni ste sa ostalih uređaja.', 'success')
          }}
        >
          Potvrdi
        </Button>
      </SimpleModal>

      <SimpleModal open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="Vrati početno stanje" closeLabel="Otkaži">
        <p className="text-sm text-slate-700">
          Jeste li sigurni da želite vratiti početno stanje? Ova radnja će poništiti trenutne promjene u aplikaciji.
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={() => setResetConfirmOpen(false)}>
            Odustani
          </Button>
          <Button className="flex-1" variant="danger" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
            Vrati početno stanje
          </Button>
        </div>
      </SimpleModal>

      <ProblemReportModal
        open={vehicleFaultOpen}
        onOpenChange={setVehicleFaultOpen}
        loading={reportMut.isPending}
        initialType="kvar_vozila"
        onSend={(type, description) => reportMut.mutate({ type, description })}
      />
    </div>
  )
}
