import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, ChevronRight, Clock3, FileText, Globe2, HelpCircle, Home, LampDesk, Loader2, LogOut, Mail, MapPin, Phone, Shield, Sparkles, Star, Trash2, User } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Location } from '../types/domain'
import { getGuestLang, setGuestLang } from '../i18n/guestLocale'
import { logout, updateProfile } from '../services/authApi'
import { purgePassengerHistory } from '../services/rideApi'
import { useToastStore } from '../store/notificationStore'
import { clearHistoryInApp, getHistoryPrivacyPrefs, setSaveHistoryPreference } from '../lib/historyPrivacy'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'

export function ProfilePage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [profileValues, setProfileValues] = useState({
    firstName: me.profile.firstName,
    lastName: me.profile.lastName,
    email: me.account.email,
    phone: me.account.phone,
  })
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof typeof profileValues, string>>>({})
  const [passwordModal, setPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<{ next?: string; confirm?: string }>({})
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [twoFaStep, setTwoFaStep] = useState<0 | 1 | 2 | 3>(0)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [notifyPrefs, setNotifyPrefs] = useState({
    email: true,
    push: true,
    rides: true,
    promos: false,
    security: true,
  })
  const historyPrefs = getHistoryPrivacyPrefs(me.account.id)
  const [locationPrefs, setLocationPrefs] = useState({ gps: true, saveHistory: historyPrefs.saveHistory })
  const [language, setLanguage] = useState<'bs' | 'en'>(getGuestLang())
  const [defaultRideType, setDefaultRideType] = useState<'odmah' | 'zakazi'>('odmah')
  const [supportModal, setSupportModal] = useState(false)
  const [faqModal, setFaqModal] = useState(false)
  const [supportType, setSupportType] = useState<'bug' | 'improvement' | 'ui' | 'slow'>('bug')
  const [supportArea, setSupportArea] = useState(() => (getGuestLang() === 'en' ? 'Order ride' : 'Naruči vožnju'))
  const [supportData, setSupportData] = useState({ issue: '', expected: '', happened: '' })
  const [supportLoading, setSupportLoading] = useState(false)
  const [policyModal, setPolicyModal] = useState(false)
  const [termsModal, setTermsModal] = useState(false)
  const [deleteHistoryModal, setDeleteHistoryModal] = useState(false)
  const [deleteHistoryLoading, setDeleteHistoryLoading] = useState(false)
  const [deleteHistoryStep, setDeleteHistoryStep] = useState<1 | 2>(1)
  const [addLocationModal, setAddLocationModal] = useState(false)
  const [rideTargetModal, setRideTargetModal] = useState<Location | null>(null)
  const [savedLocations, setSavedLocations] = useState({
    home: 'Ul. Zmaja od Bosne 12, Sarajevo',
    work: 'Trg djece Sarajeva 5, Sarajevo',
    favorites: [
      { id: 'fav-1', name: 'Aerodrom', address: 'Kurta Schorka 36, Sarajevo' },
      { id: 'fav-2', name: 'BCC', address: 'Branilaca Sarajeva 20, Sarajevo' },
    ],
  })
  const [locationForm, setLocationForm] = useState({ name: '', address: '', type: 'favorit' as 'kuca' | 'posao' | 'favorit' })
  const isEnglish = language === 'en'
  const tr = (bs: string, en: string) => (isEnglish ? en : bs)

  const save = useMutation({
    mutationFn: (v: typeof profileValues) => updateProfile(me.account.id, v),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(strings().common.error, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(tr('Podaci su uspješno sačuvani', 'Data saved successfully'), 'success')
    },
  })

  const out = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate('/welcome', { replace: true })
    },
  })

  const supportTypeTone = {
    bug: { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: tr('Tehnička greška', 'Technical issue') },
    improvement: { icon: LampDesk, color: 'text-blue-700 bg-blue-100', label: tr('Prijedlog poboljšanja', 'Improvement suggestion') },
    ui: { icon: Sparkles, color: 'text-violet-700 bg-violet-100', label: tr('Problem sa interfejsom', 'Interface issue') },
    slow: { icon: Clock3, color: 'text-orange-700 bg-orange-100', label: tr('Spor rad aplikacije', 'Slow app performance') },
  }

  function validateProfile() {
    const next: Partial<Record<keyof typeof profileValues, string>> = {}
    if (!profileValues.firstName.trim()) next.firstName = tr('Ime je obavezno.', 'First name is required.')
    if (!profileValues.lastName.trim()) next.lastName = tr('Prezime je obavezno.', 'Last name is required.')
    if (!profileValues.phone.trim()) next.phone = tr('Telefon je obavezan.', 'Phone is required.')
    if (!profileValues.email.trim()) next.email = tr('E-mail je obavezan.', 'Email is required.')
    if (profileValues.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileValues.email)) next.email = tr('Neispravan e-mail format.', 'Invalid email format.')
    setProfileErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSaveProfile() {
    if (!validateProfile()) return
    save.mutate(profileValues)
  }

  function handlePasswordChange() {
    const nextErrors: { next?: string; confirm?: string } = {}
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      push(tr('Sva polja za lozinku su obavezna.', 'All password fields are required.'), 'error')
      return
    }
    if (passwordForm.next.length < 8) nextErrors.next = tr('Nova lozinka mora imati najmanje 8 karaktera.', 'New password must contain at least 8 characters.')
    if (passwordForm.next !== passwordForm.confirm) nextErrors.confirm = tr('Potvrda lozinke se ne poklapa.', 'Password confirmation does not match.')
    setPasswordErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setPasswordLoading(true)
    window.setTimeout(() => {
      setPasswordLoading(false)
      setPasswordModal(false)
      setPasswordForm({ current: '', next: '', confirm: '' })
      push(tr('Lozinka je uspješno promijenjena.', 'Password changed successfully.'), 'success')
    }, 800)
  }

  function handleEnable2fa() {
    if (twoFaCode.trim().length !== 6 || !/^\d+$/.test(twoFaCode.trim())) {
      push(tr('Unesite validan 6-cifreni kod.', 'Enter a valid 6-digit code.'), 'error')
      return
    }
    setTwoFaEnabled(true)
    setTwoFaStep(0)
    setTwoFaCode('')
    push(tr('2FA je uspješno aktivirana', '2FA activated successfully'), 'success')
  }

  function addSavedLocation() {
    if (!locationForm.name.trim() || !locationForm.address.trim()) {
      push(tr('Naziv i adresa su obavezni.', 'Name and address are required.'), 'error')
      return
    }
    if (locationForm.type === 'kuca') setSavedLocations((prev) => ({ ...prev, home: locationForm.address.trim() }))
    else if (locationForm.type === 'posao') setSavedLocations((prev) => ({ ...prev, work: locationForm.address.trim() }))
    else {
      setSavedLocations((prev) => ({
        ...prev,
        favorites: [...prev.favorites, { id: `fav-${Date.now()}`, name: locationForm.name.trim(), address: locationForm.address.trim() }],
      }))
    }
    setAddLocationModal(false)
    setLocationForm({ name: '', address: '', type: 'favorit' })
    push(tr('Lokacija je uspješno sačuvana.', 'Location saved successfully.'), 'success')
  }

  function selectLocationForRide(address: string) {
    setRideTargetModal({
      id: `manual-${Date.now()}`,
      label: address,
      address,
      lat: 43.8563,
      lng: 18.4131,
      zoneId: 'sarajevo',
    })
  }

  function openOrderWithTarget(mode: 'pickup' | 'destination') {
    if (!rideTargetModal) return
    navigate('/app/order', { state: mode === 'pickup' ? { pickup: rideTargetModal } : { destination: rideTargetModal } })
  }

  function sendSupportTicket() {
    if (!supportData.issue.trim() || !supportData.expected.trim() || !supportData.happened.trim()) {
      push(tr('Molimo popunite sva polja prijave.', 'Please fill in all report fields.'), 'error')
      return
    }
    setSupportLoading(true)
    window.setTimeout(() => {
      setSupportLoading(false)
      setSupportModal(false)
      setSupportData({ issue: '', expected: '', happened: '' })
      push(tr('Prijava je uspješno poslana.', 'Report sent successfully.'), 'success')
    }, 900)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold text-brand-navy">{tr('Postavke', 'Settings')}</h1>
      <Card className="shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <CardHeader className="p-6 pb-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle className="text-2xl font-bold">{profileValues.firstName} {profileValues.lastName}</CardTitle>
            <Badge className={cn('rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold', me.account.status === 'aktivan' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')}>
              {t.profile.status}: {t.profile.accountStatus[me.account.status as keyof typeof t.profile.accountStatus] ?? me.account.status}
            </Badge>
          </div>
          <p className="pt-2 text-sm text-slate-600">
            {tr(
              'Centralno mjesto za profil, sigurnost, privatnost, favorite i podršku.',
              'Central place for profile, security, privacy, saved places, and support.'
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <SectionCard icon={User} title={tr('Profil', 'Profile')} color="bg-slate-900/90 text-white">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('Ime', 'First name')} value={profileValues.firstName} onChange={(value) => setProfileValues((prev) => ({ ...prev, firstName: value }))} error={profileErrors.firstName} />
              <Field label={tr('Prezime', 'Last name')} value={profileValues.lastName} onChange={(value) => setProfileValues((prev) => ({ ...prev, lastName: value }))} error={profileErrors.lastName} />
              <Field label="E-mail" value={profileValues.email} onChange={(value) => setProfileValues((prev) => ({ ...prev, email: value }))} error={profileErrors.email} type="email" />
              <Field label={tr('Broj telefona', 'Phone number')} value={profileValues.phone} onChange={(value) => setProfileValues((prev) => ({ ...prev, phone: value }))} error={profileErrors.phone} />
            </div>
            <Button type="button" className="w-full sm:w-auto" disabled={save.isPending} onClick={handleSaveProfile}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {save.isPending ? tr('Čuvanje...', 'Saving...') : tr('Sačuvaj promjene', 'Save changes')}
            </Button>
          </SectionCard>

          <SectionCard icon={Shield} title={tr('Sigurnost', 'Security')} color="bg-blue-700 text-white">
            <div className="space-y-3">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">{tr('Promjena lozinke', 'Change password')}</p>
                    <p className="text-sm text-slate-600">{tr('Ažurirajte lozinku radi veće sigurnosti naloga.', 'Update your password for better account security.')}</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setPasswordModal(true)}>{tr('Promijeni lozinku', 'Change password')}</Button>
                </div>
              </div>
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">{tr('Dvofaktorska autentifikacija', 'Two-factor authentication')}</p>
                    <p className="text-sm text-slate-600">{twoFaEnabled ? tr('2FA aktivna', '2FA enabled') : tr('2FA nije aktivirana', '2FA not enabled')}</p>
                  </div>
                  <Button type="button" variant={twoFaEnabled ? 'danger' : 'secondary'} onClick={() => {
                    if (twoFaEnabled) {
                      setTwoFaEnabled(false)
                      push(tr('2FA je isključena.', '2FA disabled.'), 'success')
                      return
                    }
                    setTwoFaStep(1)
                  }}>
                    {twoFaEnabled ? tr('Isključi 2FA', 'Disable 2FA') : tr('Aktiviraj 2FA', 'Enable 2FA')}
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Bell} title={tr('Obavještenja', 'Notifications')} color="bg-emerald-600 text-white">
            <ToggleRow
              title={tr('Email obavještenja', 'Email notifications')}
              description={tr('Primajte važne informacije i potvrde putem e-maila.', 'Receive important updates and confirmations by email.')}
              enabled={notifyPrefs.email}
              onChange={(v) => setNotifyPrefs((prev) => ({ ...prev, email: v }))}
            />
            <ToggleRow
              title={tr('Push obavještenja', 'Push notifications')}
              description={tr('Primajte informacije o dolasku vozača i statusu vožnje.', 'Get updates about driver arrival and ride status.')}
              enabled={notifyPrefs.push}
              onChange={(v) => setNotifyPrefs((prev) => ({ ...prev, push: v }))}
            />
            <ToggleRow
              title={tr('Obavještenja o vožnji', 'Ride notifications')}
              description={tr('Ažuriranja tokom svake aktivne vožnje.', 'Updates during every active ride.')}
              enabled={notifyPrefs.rides}
              onChange={(v) => setNotifyPrefs((prev) => ({ ...prev, rides: v }))}
            />
            <ToggleRow
              title="Promocije i popusti"
              description="Posebne ponude i promo kodovi UrbanFlow aplikacije."
              enabled={notifyPrefs.promos}
              onChange={(v) => setNotifyPrefs((prev) => ({ ...prev, promos: v }))}
            />
            <ToggleRow
              title={tr('Sigurnosna obavještenja', 'Security notifications')}
              description={tr('Preporučeno: obavijesti o prijavi, promjeni lozinke i sigurnosti.', 'Recommended: login, password, and security alerts.')}
              enabled={notifyPrefs.security}
              onChange={(v) => setNotifyPrefs((prev) => ({ ...prev, security: v }))}
              recommendedLabel={tr('Preporučeno', 'Recommended')}
              recommended
            />
          </SectionCard>

          <SectionCard icon={MapPin} title={tr('Lokacija i privatnost', 'Location and privacy')} color="bg-cyan-700 text-white">
            <ToggleRow
              title={tr('Koristi GPS lokaciju', 'Use GPS location')}
              description={tr('Omogućava brže postavljanje polazišta i preciznije procjene.', 'Enables faster pickup setup and more accurate estimates.')}
              enabled={locationPrefs.gps}
              onChange={(v) => setLocationPrefs((prev) => ({ ...prev, gps: v }))}
            />
            {!locationPrefs.gps ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                {tr('Lokaciju možete unijeti ručno.', 'You can enter location manually.')}
              </p>
            ) : null}
            <ToggleRow
              title={tr('Sačuvaj historiju lokacija', 'Save location history')}
              description={tr('Čuvanje historije pomaže bržem ponavljanju ruta i podršci.', 'Location history helps with quick route reuse and support.')}
              enabled={locationPrefs.saveHistory}
              onChange={(v) => {
                setLocationPrefs((prev) => ({ ...prev, saveHistory: v }))
                setSaveHistoryPreference(me.account.id, v)
                if (!v) {
                  push(
                    tr(
                      'Historija vožnji je isključena. Nove vožnje se više neće čuvati u historiji.',
                      'Ride history is disabled. New rides will no longer be saved to history.'
                    ),
                    'info'
                  )
                }
              }}
            />
            <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {tr(
                'Napomena: kada je opcija isključena, nove vožnje se ne prikazuju niti čuvaju u historiji.',
                'Note: when this option is disabled, new rides are not shown or saved in history.'
              )}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="justify-start gap-2"
              onClick={() => {
                setDeleteHistoryStep(1)
                setDeleteHistoryModal(true)
              }}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              {tr('Obriši historiju', 'Delete history')}
            </Button>
          </SectionCard>

          <SectionCard icon={Star} title={tr('Favoriti i sačuvane lokacije', 'Favorites and saved locations')} color="bg-amber-500 text-brand-navy">
            <div className="grid gap-3 md:grid-cols-2">
              <SavedLocationCard title={tr('Kuća', 'Home')} address={savedLocations.home} onEdit={() => { setLocationForm({ name: tr('Kuća', 'Home'), address: savedLocations.home, type: 'kuca' }); setAddLocationModal(true) }} onUse={() => selectLocationForRide(savedLocations.home)} icon={Home} editLabel={tr('Uredi', 'Edit')} useLabel={tr('Koristi za vožnju', 'Use for ride')} />
              <SavedLocationCard title={tr('Posao', 'Work')} address={savedLocations.work} onEdit={() => { setLocationForm({ name: tr('Posao', 'Work'), address: savedLocations.work, type: 'posao' }); setAddLocationModal(true) }} onUse={() => selectLocationForRide(savedLocations.work)} icon={MapPin} editLabel={tr('Uredi', 'Edit')} useLabel={tr('Koristi za vožnju', 'Use for ride')} />
            </div>
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
              <p className="mb-3 font-semibold text-brand-navy">Favoriti</p>
              <div className="space-y-2">
                {savedLocations.favorites.map((fav) => (
                  <div key={fav.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2">
                    <div>
                      <p className="font-semibold text-brand-navy">{fav.name}</p>
                      <p className="text-sm text-slate-600">{fav.address}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => selectLocationForRide(fav.address)}>{tr('Koristi za vožnju', 'Use for ride')}</Button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setAddLocationModal(true)}>{tr('Dodaj lokaciju', 'Add location')}</Button>
          </SectionCard>

          <SectionCard icon={Globe2} title={tr('Personalizacija', 'Personalization')} color="bg-indigo-600 text-white">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tr('Jezik aplikacije', 'App language')}</Label>
                <select className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy" value={language} onChange={(e) => {
                  const next = e.target.value as 'bs' | 'en'
                  setLanguage(next)
                  setGuestLang(next)
                  push(tr('Jezik je promijenjen.', 'Language changed.'), 'success')
                }}>
                  <option value="bs">Bosanski</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{tr('Zadani tip vožnje', 'Default ride type')}</Label>
                <select className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy" value={defaultRideType} onChange={(e) => setDefaultRideType(e.target.value as 'odmah' | 'zakazi')}>
                  <option value="odmah">{tr('Odmah', 'Now')}</option>
                  <option value="zakazi">{tr('Zakaži', 'Schedule')}</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={HelpCircle} title={tr('Podrška', 'Support')} color="bg-red-600 text-white">
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-brand-navy">{tr('Kontakt podrške', 'Support contact')}</p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-700" />support@urbanflow.ba</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-700" />+387 61 000 000</div>
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-700" />08:00-22:00</div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" className="w-full justify-between" onClick={() => setSupportModal(true)}>{tr('Prijavi problem', 'Report a problem')}<ChevronRight className="h-4 w-4" /></Button>
              <Button variant="secondary" className="w-full justify-between" onClick={() => setFaqModal(true)}>{tr('Česta pitanja', 'FAQ')}<ChevronRight className="h-4 w-4" /></Button>
            </div>
          </SectionCard>

          <SectionCard icon={FileText} title={tr('Pravne informacije', 'Legal information')} color="bg-violet-600 text-white">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" className="justify-between" onClick={() => setPolicyModal(true)}>{tr('Politika privatnosti', 'Privacy policy')}<ChevronRight className="h-4 w-4" /></Button>
              <Button variant="secondary" className="justify-between" onClick={() => setTermsModal(true)}>{tr('Uslovi korištenja', 'Terms of use')}<ChevronRight className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm text-slate-600">{tr('Verzija aplikacije', 'App version')}: v1.0.0</p>
          </SectionCard>

          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <h2 className="text-lg font-semibold text-red-700">{tr('Odjava', 'Logout')}</h2>
            <p className="mt-1 text-sm text-red-700/90">{tr('Odjavite se sa ovog uređaja.', 'Log out from this device.')}</p>
            <Button className="mt-3 w-full sm:w-auto" variant="danger" onClick={() => out.mutate()}><LogOut className="h-4 w-4" />{tr('Odjavi se', 'Log out')}</Button>
          </section>
        </CardContent>
      </Card>
      <SimpleModal open={passwordModal} onClose={() => setPasswordModal(false)} title={tr('Promjena lozinke', 'Change password')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-3">
          <Field label={tr('Trenutna lozinka', 'Current password')} value={passwordForm.current} onChange={(value) => setPasswordForm((prev) => ({ ...prev, current: value }))} type="password" />
          <Field label={tr('Nova lozinka', 'New password')} value={passwordForm.next} onChange={(value) => setPasswordForm((prev) => ({ ...prev, next: value }))} type="password" error={passwordErrors.next} />
          <Field label={tr('Potvrdi novu lozinku', 'Confirm new password')} value={passwordForm.confirm} onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirm: value }))} type="password" error={passwordErrors.confirm} />
          <Button className="w-full" onClick={handlePasswordChange} disabled={passwordLoading}>{passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{passwordLoading ? tr('Mijenjanje...', 'Changing...') : tr('Promijeni lozinku', 'Change password')}</Button>
        </div>
      </SimpleModal>
      <SimpleModal open={twoFaStep === 1} onClose={() => setTwoFaStep(0)} title={tr('Dvofaktorska autentifikacija', 'Two-factor authentication')} closeLabel={tr('Zatvori', 'Close')}>
        <p className="text-sm text-slate-600">{tr('Dvofaktorska autentifikacija dodaje dodatni sloj sigurnosti vašem nalogu.', 'Two-factor authentication adds an extra layer of security to your account.')}</p>
        <Button className="mt-4 w-full" onClick={() => setTwoFaStep(2)}>{tr('Aktiviraj 2FA', 'Enable 2FA')}</Button>
      </SimpleModal>
      <SimpleModal open={twoFaStep === 2} onClose={() => setTwoFaStep(0)} title={tr('Dvofaktorska autentifikacija', 'Two-factor authentication')} closeLabel={tr('Zatvori', 'Close')}>
        <p className="text-sm text-slate-600">{tr('Skenirajte QR kod pomoću vaše autentifikacijske aplikacije.', 'Scan the QR code with your authenticator app.')}</p>
        <div className="mt-3 flex h-44 w-full items-center justify-center rounded-2xl border border-dashed border-black/20 bg-slate-50"><div className="h-28 w-28 rounded-lg bg-slate-900 text-center text-[10px] font-semibold leading-[7rem] text-white">QR</div></div>
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-brand-navy">ABCD EFGH IJKL MNOP</p>
        <Button className="mt-4 w-full" onClick={() => setTwoFaStep(3)}>{tr('Nastavi', 'Continue')}</Button>
      </SimpleModal>
      <SimpleModal open={twoFaStep === 3} onClose={() => setTwoFaStep(0)} title={tr('Dvofaktorska autentifikacija', 'Two-factor authentication')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-2">
          <Label htmlFor="fa-code">{tr('Unesite 6-cifreni kod', 'Enter 6-digit code')}</Label>
          <Input id="fa-code" maxLength={6} value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value.replace(/[^\d]/g, ''))} />
        </div>
        <Button className="mt-4 w-full" onClick={handleEnable2fa}>{tr('Potvrdi', 'Confirm')}</Button>
      </SimpleModal>
      <SimpleModal open={addLocationModal} onClose={() => setAddLocationModal(false)} title={tr('Dodaj lokaciju', 'Add location')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-3">
          <Field label={tr('Naziv lokacije', 'Location name')} value={locationForm.name} onChange={(value) => setLocationForm((prev) => ({ ...prev, name: value }))} />
          <Field label={tr('Adresa', 'Address')} value={locationForm.address} onChange={(value) => setLocationForm((prev) => ({ ...prev, address: value }))} />
          <div className="space-y-1.5">
            <Label>{tr('Tip', 'Type')}</Label>
            <select className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy" value={locationForm.type} onChange={(e) => setLocationForm((prev) => ({ ...prev, type: e.target.value as 'kuca' | 'posao' | 'favorit' }))}>
              <option value="kuca">{tr('Kuća', 'Home')}</option>
              <option value="posao">{tr('Posao', 'Work')}</option>
              <option value="favorit">{tr('Favorit', 'Favorite')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button className="w-full" onClick={addSavedLocation}>{tr('Sačuvaj lokaciju', 'Save location')}</Button>
            <Button className="w-full" variant="secondary" onClick={() => setAddLocationModal(false)}>{tr('Otkaži', 'Cancel')}</Button>
          </div>
        </div>
      </SimpleModal>
      <SimpleModal open={!!rideTargetModal} onClose={() => setRideTargetModal(null)} title={tr('Koristi za vožnju', 'Use for ride')} closeLabel={tr('Zatvori', 'Close')}>
        <p className="text-sm text-slate-600">{tr('Kako želite koristiti ovu lokaciju?', 'How do you want to use this location?')}</p>
        <div className="mt-4 grid gap-2">
          <Button className="w-full" onClick={() => openOrderWithTarget('pickup')}>{tr('Postavi kao polazište', 'Set as pickup')}</Button>
          <Button className="w-full" variant="secondary" onClick={() => openOrderWithTarget('destination')}>{tr('Postavi kao odredište', 'Set as destination')}</Button>
        </div>
      </SimpleModal>
      <SimpleModal open={supportModal} onClose={() => setSupportModal(false)} title={tr('Prijavi problem ili grešku', 'Report a problem or bug')} closeLabel={tr('Zatvori', 'Close')} large>
        <p className="text-sm text-slate-600">{tr('Pomoću ovog formulara možete prijaviti tehničke probleme, predložiti poboljšanja ili prijaviti greške u sistemu.', 'Use this form to report technical problems, suggest improvements, or report system bugs.')}</p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>{tr('Vrsta prijave', 'Report type')}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(supportTypeTone).map(([id, entry]) => {
                const Icon = entry.icon
                const active = supportType === id
                return (
                  <button type="button" key={id} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors', active ? 'border-brand-navy bg-slate-50' : 'border-black/[0.08] bg-white hover:bg-slate-50')} onClick={() => setSupportType(id as 'bug' | 'improvement' | 'ui' | 'slow')}>
                    <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full', entry.color)}><Icon className="h-4 w-4" /></span>
                    <span className="font-medium text-brand-navy">{entry.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{tr('Gdje se problem pojavljuje?', 'Where does the problem appear?')}</Label>
            <select className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy" value={supportArea} onChange={(e) => setSupportArea(e.target.value)}>
              <option>{tr('Naruči vožnju', 'Order ride')}</option>
              <option>{tr('Aktivna vožnja', 'Active ride')}</option>
              <option>{tr('Historija', 'History')}</option>
              <option>{tr('Profil', 'Profile')}</option>
              <option>{tr('Postavke', 'Settings')}</option>
            </select>
          </div>
          <TextAreaField label={tr('Opis problema', 'Problem description')} value={supportData.issue} onChange={(value) => setSupportData((prev) => ({ ...prev, issue: value }))} />
          <TextAreaField label={tr('Šta ste očekivali?', 'What did you expect?')} value={supportData.expected} onChange={(value) => setSupportData((prev) => ({ ...prev, expected: value }))} />
          <TextAreaField label={tr('Šta se zapravo desilo?', 'What actually happened?')} value={supportData.happened} onChange={(value) => setSupportData((prev) => ({ ...prev, happened: value }))} />
          <div className="flex gap-2">
            <Button variant="secondary" className="w-full" onClick={() => setSupportModal(false)}>{tr('Otkaži', 'Cancel')}</Button>
            <Button className="w-full" onClick={sendSupportTicket} disabled={supportLoading}>{supportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{supportLoading ? tr('Slanje...', 'Sending...') : tr('Pošalji prijavu', 'Submit report')}</Button>
          </div>
        </div>
      </SimpleModal>
      <SimpleModal open={faqModal} onClose={() => setFaqModal(false)} title={tr('Česta pitanja', 'Frequently asked questions')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <div>
            <p className="font-semibold text-brand-navy">{tr('Kako kontaktirati podršku?', 'How can I contact support?')}</p>
            <p>{tr('Podrška je dostupna putem e-maila, telefona i kroz obrazac za prijavu problema.', 'Support is available by email, phone, and through the problem report form.')}</p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy">{tr('Koliko traje odgovor podrške?', 'How long does support response take?')}</p>
            <p>{tr('Uobičajeno vrijeme odgovora je unutar radnog vremena 08:00-22:00.', 'Typical response time is during working hours 08:00-22:00.')}</p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy">{tr('Kako prijaviti grešku u aplikaciji?', 'How do I report a bug in the app?')}</p>
            <p>{tr('Otvorite "Prijavi problem", opišite šta ste očekivali i šta se desilo, pa pošaljite prijavu.', 'Open "Report a problem", describe what you expected and what happened, then submit the report.')}</p>
          </div>
        </div>
      </SimpleModal>
      <SimpleModal open={policyModal} onClose={() => setPolicyModal(false)} title={tr('Politika privatnosti', 'Privacy policy')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          <p>{tr('Vaši podaci se koriste samo za funkcionalnosti aplikacije i sigurnost vožnje.', 'Your data is used only for app functionality and ride safety.')}</p>
          <p>{tr('Lokacija se koristi za pronalazak vozača i procjenu rute, bez prodaje trećim stranama.', 'Location is used for driver matching and route estimates, without selling data to third parties.')}</p>
        </div>
      </SimpleModal>
      <SimpleModal open={termsModal} onClose={() => setTermsModal(false)} title={tr('Uslovi korištenja', 'Terms of use')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          <p>{tr('Korištenjem aplikacije prihvatate uslove vožnje, pravila ponašanja i način obračuna cijene.', 'By using the app, you accept ride terms, behavior rules, and pricing policy.')}</p>
          <p>{tr('UrbanFlow Taxi može ažurirati funkcionalnosti aplikacije tokom razvoja.', 'UrbanFlow Taxi may update app functionality during development.')}</p>
        </div>
      </SimpleModal>
      <SimpleModal
        open={deleteHistoryModal}
        onClose={() => {
          setDeleteHistoryModal(false)
          setDeleteHistoryStep(1)
        }}
        title={tr('Potvrda brisanja historije', 'Confirm history deletion')}
        closeLabel={tr('Zatvori', 'Close')}
      >
        <div className="space-y-3">
          {deleteHistoryStep === 1 ? (
            <>
              <p className="text-sm text-slate-700">
                {tr(
                  'Prije nastavka: brisanjem historije uklanjate sve vožnje iz prikaza aplikacije, uključujući detalje, ocjene i povezane prijave problema.',
                  'Before continuing: deleting history removes all rides from the app view, including details, ratings, and related problem reports.'
                )}
              </p>
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {tr(
                  'Ovo je teško poništiti u aplikaciji. Podaci se i dalje čuvaju u sistemu 30 dana radi sigurnosti.',
                  'This is hard to undo inside the app. Data is still retained in the system for 30 days for security.'
                )}
              </p>
              <div className="flex gap-2">
                <Button className="w-full" variant="secondary" onClick={() => setDeleteHistoryModal(false)}>
                  {tr('Otkaži', 'Cancel')}
                </Button>
                <Button className="w-full" variant="danger" onClick={() => setDeleteHistoryStep(2)}>
                  {tr('Nastavi', 'Continue')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-brand-danger">
                {tr(
                  'Zadnja potvrda: da li ste sigurni da želite trajno obrisati historiju iz aplikacije?',
                  'Final confirmation: are you sure you want to permanently delete history from the app?'
                )}
              </p>
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {tr(
                  'Nakon potvrde, historija više neće biti vidljiva i potrebno je novo kreiranje vožnji.',
                  'After confirmation, history will no longer be visible and new rides must be created again.'
                )}
              </p>
              <div className="flex gap-2">
                <Button className="w-full" variant="secondary" onClick={() => setDeleteHistoryStep(1)}>
                  {tr('Nazad', 'Back')}
                </Button>
                <Button
                  className="w-full"
                  variant="danger"
                  disabled={deleteHistoryLoading}
                  onClick={async () => {
                    setDeleteHistoryLoading(true)
                    await purgePassengerHistory(me.account.id, me.profile.id)
                    clearHistoryInApp(me.account.id)
                    setDeleteHistoryLoading(false)
                    setDeleteHistoryModal(false)
                    setDeleteHistoryStep(1)
                    await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
                    push(
                      tr(
                        'Historija je obrisana iz aplikacije. Podaci se i dalje čuvaju 30 dana radi sigurnosti.',
                        'History was deleted from the app. Data is still retained for 30 days for security.'
                      ),
                      'success'
                    )
                  }}
                >
                  {deleteHistoryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {deleteHistoryLoading ? tr('Brisanje...', 'Deleting...') : tr('Da, obriši historiju', 'Yes, delete history')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SimpleModal>
    </div>
  )
}

function SectionCard({ icon: Icon, title, color, children }: { icon: ComponentType<{ className?: string }>; title: string; color: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-black/[0.08] bg-slate-50/60 p-4">
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full', color)}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
  recommended,
  recommendedLabel,
}: {
  title: string
  description: string
  enabled: boolean
  onChange: (next: boolean) => void
  recommended?: boolean
  recommendedLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-brand-navy">
            {title} {recommended ? <span className="text-xs font-medium text-emerald-700">({recommendedLabel ?? 'Recommended'})</span> : null}
          </p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
            enabled ? 'bg-emerald-500' : 'bg-slate-300'
          )}
        >
          <span
            className={cn(
              'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, error, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; error?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bg-white" />
      {error ? <p className="text-xs font-medium text-brand-danger">{error}</p> : null}
    </div>
  )
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[100px] w-full rounded-xl border border-black/[0.14] bg-white px-3 py-2 text-sm text-brand-navy outline-none ring-brand-yellow/50 focus:ring-2" />
    </div>
  )
}

function SavedLocationCard({ title, address, onEdit, onUse, icon: Icon, editLabel, useLabel }: { title: string; address: string; onEdit: () => void; onUse: () => void; icon: ComponentType<{ className?: string }>; editLabel: string; useLabel: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Icon className="h-4 w-4" />
        </span>
        <p className="font-semibold text-brand-navy">{title}</p>
      </div>
      <p className="text-sm text-slate-600">{address}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>{editLabel}</Button>
        <Button size="sm" onClick={onUse}>{useLabel}</Button>
      </div>
    </div>
  )
}

function SimpleModal({ open, onClose, title, children, large, closeLabel }: { open: boolean; onClose: () => void; title: string; children: ReactNode; large?: boolean; closeLabel?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6">
      <div className={cn('max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[86vh] sm:rounded-2xl', large ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>{closeLabel ?? 'Close'}</Button>
        </div>
        {children}
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label="Zatvori modal" onClick={onClose} />
    </div>
  )
}
