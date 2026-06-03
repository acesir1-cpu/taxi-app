import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, Camera, ChevronRight, Clock3, FileText, Globe2, HelpCircle, Home, LampDesk, Loader2, LogOut, Mail, MapPin, Phone, Shield, Sparkles, Star, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { useLangRefresh } from '../hooks/useLangRefresh'
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
import { GpsConsentDialog } from '../components/onboarding/GpsConsentDialog'
import { AccountProfileFormFields } from '../components/settings/AccountProfileFormFields'
import { LogoutSection } from '../components/settings/LogoutSection'
import { SavedLocationCard } from '../components/settings/SavedLocationCard'
import { SettingsField } from '../components/settings/SettingsField'
import { SettingsSectionCard } from '../components/settings/SettingsSectionCard'
import { SecurityFeatureRow, SecuritySettingsStack } from '../components/settings/SecuritySettingsSection'
import { SimpleModal } from '../components/settings/SimpleModal'
import { TextAreaField } from '../components/settings/TextAreaField'
import { ToggleRow } from '../components/settings/ToggleRow'
import { validateAccountProfile } from '../lib/accountProfileValidation'
import {
  defaultPassengerSavedLocations,
  loadPassengerLocationPrefs,
  loadPassengerNotifyPrefs,
  loadPassengerPersonalize,
  loadPassengerProfileExtras,
  savePassengerLocationPrefs,
  savePassengerNotifyPrefs,
  savePassengerPersonalize,
  savePassengerProfileExtras,
} from '../lib/passengerSettingsPrefs'
import { cn } from '../lib/utils'
import rabbitAvatar from '../../pictures/rabbit.png'
import pandaAvatar from '../../pictures/panda.png'
import chickenAvatar from '../../pictures/chicken.png'
import manAvatar from '../../pictures/man.png'
import womanOneAvatar from '../../pictures/woman (1).png'
import girlAvatar from '../../pictures/girl.png'
import womanAvatar from '../../pictures/woman.png'
import boyAvatar from '../../pictures/boy.png'

type AvatarPreset = {
  id: string
  label: { bs: string; en: string }
  src: string
}

const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'rabbit', label: { bs: 'Zec', en: 'Rabbit' }, src: rabbitAvatar },
  { id: 'panda', label: { bs: 'Panda', en: 'Panda' }, src: pandaAvatar },
  { id: 'chicken', label: { bs: 'Pilić', en: 'Chicken' }, src: chickenAvatar },
  { id: 'man', label: { bs: 'Muškarac', en: 'Man' }, src: manAvatar },
  { id: 'woman1', label: { bs: 'Žena 1', en: 'Woman 1' }, src: womanOneAvatar },
  { id: 'girl', label: { bs: 'Djevojčica', en: 'Girl' }, src: girlAvatar },
  { id: 'woman2', label: { bs: 'Žena 2', en: 'Woman 2' }, src: womanAvatar },
  { id: 'boy', label: { bs: 'Dječak', en: 'Boy' }, src: boyAvatar },
]

export function ProfilePage() {
  useLangRefresh()
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [profileValues, setProfileValues] = useState(() => {
    const ex = loadPassengerProfileExtras(me.account.id)
    const pers = loadPassengerPersonalize(me.account.id)
    return {
      firstName: me.profile.firstName,
      lastName: me.profile.lastName,
      email: me.account.email,
      phone: me.account.phone,
      city: ex.city,
      address: ex.address,
      appLang: (pers.appLang ?? getGuestLang()) as 'bs' | 'en',
    }
  })
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof typeof profileValues, string>>>({})
  const [profilePhoto, setProfilePhoto] = useState(() => loadPassengerProfileExtras(me.account.id).avatarDataUrl ?? '')
  const [passwordModal, setPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<{ next?: string; confirm?: string }>({})
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [twoFaStep, setTwoFaStep] = useState<0 | 1 | 2 | 3>(0)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [notifyPrefs, setNotifyPrefs] = useState(() => loadPassengerNotifyPrefs(me.account.id))
  const historyPrefs = getHistoryPrivacyPrefs(me.account.id)
  const [locationPrefs, setLocationPrefs] = useState(() => {
    const gpsPrefs = loadPassengerLocationPrefs(me.account.id)
    return { gps: gpsPrefs.gps, gpsPromptSeen: gpsPrefs.gpsPromptSeen, saveHistory: historyPrefs.saveHistory }
  })
  const [defaultRideType, setDefaultRideType] = useState<'odmah' | 'zakazi'>(() => loadPassengerPersonalize(me.account.id).defaultRideType)
  const [supportModal, setSupportModal] = useState(false)
  const [faqModal, setFaqModal] = useState(false)
  const [supportType, setSupportType] = useState<'bug' | 'improvement' | 'ui' | 'slow'>('bug')
  const [supportArea, setSupportArea] = useState(() => (getGuestLang() === 'en' ? 'Order ride' : 'Naruči vožnju'))
  const [supportData, setSupportData] = useState({ issue: '', expected: '', happened: '' })
  const [supportLoading, setSupportLoading] = useState(false)
  const [policyModal, setPolicyModal] = useState(false)
  const [termsModal, setTermsModal] = useState(false)
  const [secActivityOpen, setSecActivityOpen] = useState(false)
  const [deleteHistoryModal, setDeleteHistoryModal] = useState(false)
  const [deleteHistoryLoading, setDeleteHistoryLoading] = useState(false)
  const [deleteHistoryStep, setDeleteHistoryStep] = useState<1 | 2>(1)
  const [gpsConsentOpen, setGpsConsentOpen] = useState(false)
  const [addLocationModal, setAddLocationModal] = useState(false)
  const [rideTargetModal, setRideTargetModal] = useState<Location | null>(null)
  const [savedLocations, setSavedLocations] = useState(
    () => loadPassengerProfileExtras(me.account.id).savedLocations ?? defaultPassengerSavedLocations()
  )
  const [homePostalCodeState, setHomePostalCodeState] = useState(
    () => loadPassengerProfileExtras(me.account.id).homePostalCode ?? ''
  )
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    postalCode: '',
    type: 'favorit' as 'kuca' | 'posao' | 'favorit',
  })
  const tr = (bs: string, en: string) => (getGuestLang() === 'en' ? en : bs)

  useEffect(() => {
    const ex = loadPassengerProfileExtras(me.account.id)
    const pers = loadPassengerPersonalize(me.account.id)
    setProfileValues({
      firstName: me.profile.firstName,
      lastName: me.profile.lastName,
      email: me.account.email,
      phone: me.account.phone,
      city: ex.city,
      address: ex.address,
      appLang: (pers.appLang ?? getGuestLang()) as 'bs' | 'en',
    })
    setNotifyPrefs(loadPassengerNotifyPrefs(me.account.id))
    const gpsPrefs = loadPassengerLocationPrefs(me.account.id)
    setLocationPrefs((prev) => ({ ...prev, gps: gpsPrefs.gps, gpsPromptSeen: gpsPrefs.gpsPromptSeen }))
    setDefaultRideType(pers.defaultRideType)
    setProfilePhoto(ex.avatarDataUrl ?? '')
    if (ex.savedLocations) {
      setSavedLocations(ex.savedLocations)
    }
    setHomePostalCodeState(ex.homePostalCode ?? '')
  }, [me.account.id, me.account.email, me.account.phone, me.profile.firstName, me.profile.lastName])

  useEffect(() => {
    if (location.hash !== '#profile-account') return
    requestAnimationFrame(() => {
      document.getElementById('profile-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.pathname, location.hash])

  const persistNotify = (next: typeof notifyPrefs) => {
    setNotifyPrefs(next)
    savePassengerNotifyPrefs(me.account.id, next)
  }

  const save = useMutation({
    mutationFn: async (v: typeof profileValues) => {
      const res = await updateProfile(me.account.id, {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
      })
      return { res, v }
    },
    onSuccess: async (data) => {
      const { res, v } = data
      if ('error' in res) {
        push(t.common.error, 'error')
        return
      }
      const cur = loadPassengerProfileExtras(me.account.id)
      savePassengerProfileExtras(me.account.id, {
        ...cur,
        city: v.city,
        address: v.address,
        avatarDataUrl: profilePhoto,
        homePostalCode: homePostalCodeState,
        savedLocations,
      })
      savePassengerPersonalize(me.account.id, {
        ...loadPassengerPersonalize(me.account.id),
        appLang: v.appLang,
        defaultRideType,
      })
      setGuestLang(v.appLang)
      await qc.invalidateQueries({ queryKey: ['me'] })
      push(tr('Profil je uspješno ažuriran.', 'Profile updated successfully.'), 'success')
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
    const locale = getGuestLang() === 'en' ? 'en' : 'bs'
    const next = validateAccountProfile(
      {
        firstName: profileValues.firstName,
        lastName: profileValues.lastName,
        email: profileValues.email,
        phone: profileValues.phone,
        city: profileValues.city,
        address: profileValues.address,
      },
      locale
    )
    setProfileErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSaveProfile() {
    if (!validateProfile()) return
    save.mutate(profileValues)
  }

  function handleProfilePhotoUpload(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      push(tr('Molimo odaberite sliku.', 'Please choose an image file.'), 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      push(tr('Maksimalna veličina slike je 2 MB.', 'Maximum image size is 2 MB.'), 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) {
        push(tr('Greška pri učitavanju slike.', 'Error while loading image.'), 'error')
        return
      }
      setProfilePhoto(dataUrl)
      const current = loadPassengerProfileExtras(me.account.id)
      savePassengerProfileExtras(me.account.id, { ...current, avatarDataUrl: dataUrl })
      window.dispatchEvent(new CustomEvent('urbanflow:passenger-profile-photo-updated'))
      push(tr('Profilna slika je ažurirana.', 'Profile photo updated.'), 'success')
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveProfilePhoto() {
    setProfilePhoto('')
    const current = loadPassengerProfileExtras(me.account.id)
    savePassengerProfileExtras(me.account.id, { ...current, avatarDataUrl: '' })
    window.dispatchEvent(new CustomEvent('urbanflow:passenger-profile-photo-updated'))
    push(tr('Profilna slika je uklonjena.', 'Profile photo removed.'), 'info')
  }

  function handlePresetAvatarSelect(preset: AvatarPreset) {
    setProfilePhoto(preset.src)
    const current = loadPassengerProfileExtras(me.account.id)
    savePassengerProfileExtras(me.account.id, { ...current, avatarDataUrl: preset.src })
    window.dispatchEvent(new CustomEvent('urbanflow:passenger-profile-photo-updated'))
    push(tr('Avatar je ažuriran.', 'Avatar updated.'), 'success')
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
      push(tr('Lozinka je uspješno ažurirana.', 'Password updated successfully.'), 'success')
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
    push(tr('Dvofaktorska autentifikacija je aktivirana.', 'Two-factor authentication is enabled.'), 'success')
  }

  function addSavedLocation() {
    if (!locationForm.name.trim() || !locationForm.address.trim()) {
      push(tr('Naziv i adresa su obavezni.', 'Name and address are required.'), 'error')
      return
    }
    const nextSaved =
      locationForm.type === 'kuca'
        ? { ...savedLocations, home: locationForm.address.trim() }
        : locationForm.type === 'posao'
          ? { ...savedLocations, work: locationForm.address.trim() }
          : {
              ...savedLocations,
              favorites: [
                ...savedLocations.favorites,
                { id: `fav-${Date.now()}`, name: locationForm.name.trim(), address: locationForm.address.trim() },
              ],
            }
    setSavedLocations(nextSaved)
    const current = loadPassengerProfileExtras(me.account.id)
    const nextPostal =
      locationForm.type === 'kuca' ? locationForm.postalCode.trim() : current.homePostalCode ?? ''
    if (locationForm.type === 'kuca') {
      setHomePostalCodeState(locationForm.postalCode.trim())
    }
    savePassengerProfileExtras(me.account.id, {
      ...current,
      savedLocations: nextSaved,
      ...(locationForm.type === 'kuca' ? { homePostalCode: nextPostal } : {}),
    })
    window.dispatchEvent(new CustomEvent('urbanflow:passenger-profile-extras-updated'))
    setAddLocationModal(false)
    setLocationForm({ name: '', address: '', postalCode: '', type: 'favorit' })
    push(tr('Lokacija je uspješno sačuvana.', 'Location saved successfully.'), 'success')
  }

  function selectLocationForRide(address: string) {
    if (!address.trim()) {
      push(
        tr(
          'Dodajte adresu kuće i poštanski broj u postavkama da biste koristili brzo punjenje.',
          'Add your home address and postal code in settings to use quick fill.'
        ),
        'info'
      )
      navigate('/app/profile#saved-places')
      return
    }
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
    <div className="mx-auto w-full max-w-[1200px] space-y-4" data-passenger-tour-target="profile">
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
          <SettingsSectionCard id="profile-account" icon={User} title={tr('Profil', 'Profile')} color="bg-slate-900/90 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.08] bg-white p-4">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={`${profileValues.firstName} ${profileValues.lastName}`}
                    className="h-20 w-20 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-brand-navy">
                    {profileValues.firstName.charAt(0)}
                    {profileValues.lastName.charAt(0)}
                  </div>
                )}
                <Label
                  htmlFor="profile-photo-upload"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Camera className="h-4 w-4" />
                  {tr('Dodaj fotografiju', 'Add photo')}
                </Label>
                <Input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleProfilePhotoUpload(e.target.files?.[0] ?? null)
                    e.currentTarget.value = ''
                  }}
                />
                {profilePhoto ? (
                  <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleRemoveProfilePhoto}>
                    {tr('Ukloni fotografiju', 'Remove photo')}
                  </Button>
                ) : null}
                <div className="w-full space-y-2 pt-1">
                  <p className="text-center text-xs font-medium text-slate-500">
                    {tr('...ili izaberite avatar', '...or pick an avatar')}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {AVATAR_PRESETS.map((preset) => {
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-1 active:outline-none [-webkit-tap-highlight-color:transparent]',
                            profilePhoto === preset.src
                              ? 'ring-2 ring-amber-400/80 ring-offset-1'
                              : 'hover:ring-2 hover:ring-slate-300 hover:ring-offset-1'
                          )}
                          title={getGuestLang() === 'en' ? preset.label.en : preset.label.bs}
                          onClick={() => handlePresetAvatarSelect(preset)}
                        >
                          <img
                            src={preset.src}
                            alt={getGuestLang() === 'en' ? preset.label.en : preset.label.bs}
                            className="h-full w-full rounded-full border border-slate-200 object-cover"
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <AccountProfileFormFields
                  values={profileValues}
                  errors={profileErrors}
                  onChange={(patch) => setProfileValues((prev) => ({ ...prev, ...patch }))}
                  labels={{
                    firstName: tr('Ime', 'First name'),
                    lastName: tr('Prezime', 'Last name'),
                    email: t.auth.email,
                    phone: tr('Broj telefona', 'Phone number'),
                    city: tr('Grad', 'City'),
                    address: tr('Adresa (opcionalno)', 'Address (optional)'),
                  }}
                  afterFields={
                    <div className="flex flex-col gap-1">
                      <Label>{tr('Jezik aplikacije', 'App language')}</Label>
                      <select
                        className="h-11 w-full max-w-md rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
                        value={profileValues.appLang}
                        onChange={(e) =>
                          setProfileValues((prev) => ({ ...prev, appLang: e.target.value as 'bs' | 'en' }))
                        }
                      >
                        <option value="bs">{t.profile.langOptionBs}</option>
                        <option value="en">{t.profile.langOptionEn}</option>
                      </select>
                      <p className="text-xs leading-snug text-slate-500">
                        {tr(
                          'Jezik aplikacije koristi se za prikaz interfejsa i obavještenja.',
                          'App language is used for the interface and notifications.'
                        )}
                      </p>
                    </div>
                  }
                />
              </div>
            </div>
            <Button type="button" className="w-full sm:w-auto" disabled={save.isPending} onClick={handleSaveProfile}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {save.isPending ? tr('Čuvanje...', 'Saving...') : tr('Sačuvaj promjene', 'Save changes')}
            </Button>
          </SettingsSectionCard>

          <SettingsSectionCard icon={Shield} title={tr('Sigurnost', 'Security')} color="bg-blue-700 text-white">
            <SecuritySettingsStack>
              <SecurityFeatureRow
                title={tr('Promjena lozinke', 'Change password')}
                description={tr('Ažurirajte lozinku radi veće sigurnosti naloga.', 'Update your password for better account security.')}
                action={
                  <Button type="button" variant="secondary" onClick={() => setPasswordModal(true)}>
                    {tr('Promijeni lozinku', 'Change password')}
                  </Button>
                }
              />
              <SecurityFeatureRow
                title={tr('Dvofaktorska autentifikacija', 'Two-factor authentication')}
                description={
                  twoFaEnabled
                    ? tr('Dvofaktorska autentifikacija dodatno štiti vaš nalog.', 'Two-factor authentication helps protect your account.')
                    : tr(
                        'Dvofaktorska autentifikacija dodatno štiti vaš nalog. Trenutno nije aktivirana.',
                        'Two-factor authentication helps protect your account. It is not enabled yet.'
                      )
                }
                action={
                  <Button
                    type="button"
                    variant={twoFaEnabled ? 'danger' : 'secondary'}
                    onClick={() => {
                      if (twoFaEnabled) {
                        setTwoFaEnabled(false)
                        push(tr('Dvofaktorska autentifikacija je isključena.', 'Two-factor authentication is disabled.'), 'success')
                        return
                      }
                      setTwoFaStep(1)
                    }}
                  >
                    {twoFaEnabled ? tr('Isključi 2FA', 'Disable 2FA') : tr('Aktiviraj 2FA', 'Enable 2FA')}
                  </Button>
                }
              />
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-brand-navy">{tr('Zadnja prijava', 'Last sign-in')}:</span>{' '}
                  {me.account.lastLoginAt ? new Date(me.account.lastLoginAt).toLocaleString('bs-BA') : '—'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-brand-navy">{tr('Aktivne sesije', 'Active sessions')}:</span>{' '}
                  {tr('Ovaj uređaj', 'This device')}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-brand-navy">{tr('Automatska odjava', 'Automatic sign-out')}:</span>{' '}
                  {tr('Nakon 8 sati neaktivnosti.', 'After 8 hours of inactivity.')}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSecActivityOpen(true)}>
                  {tr('Sigurnosne aktivnosti', 'Security activity')}
                </Button>
              </div>
            </SecuritySettingsStack>
          </SettingsSectionCard>

          <SettingsSectionCard icon={Bell} title={tr('Obavještenja', 'Notifications')} color="bg-emerald-600 text-white">
            <ToggleRow
              title={tr('Email obavještenja', 'Email notifications')}
              description={tr('Primajte važne informacije i potvrde putem e-maila.', 'Receive important updates and confirmations by email.')}
              enabled={notifyPrefs.email}
              onChange={(v) => persistNotify({ ...notifyPrefs, email: v })}
            />
            <ToggleRow
              title={tr('Push obavještenja', 'Push notifications')}
              description={tr('Primajte informacije o dolasku vozača i statusu vožnje.', 'Get updates about driver arrival and ride status.')}
              enabled={notifyPrefs.push}
              onChange={(v) => persistNotify({ ...notifyPrefs, push: v })}
            />
            <ToggleRow
              title={tr('Obavještenja o vožnji', 'Ride notifications')}
              description={tr('Ažuriranja tokom svake aktivne vožnje.', 'Updates during every active ride.')}
              enabled={notifyPrefs.rides}
              onChange={(v) => persistNotify({ ...notifyPrefs, rides: v })}
            />
            <ToggleRow
              title={t.profile.notifyPromosTitle}
              description={t.profile.notifyPromosDesc}
              enabled={notifyPrefs.promos}
              onChange={(v) => persistNotify({ ...notifyPrefs, promos: v })}
            />
            <ToggleRow
              title={tr('Sigurnosna obavještenja', 'Security notifications')}
              description={tr('Preporučeno: obavijesti o prijavi, promjeni lozinke i sigurnosti.', 'Recommended: login, password, and security alerts.')}
              enabled={notifyPrefs.security}
              onChange={(v) => persistNotify({ ...notifyPrefs, security: v })}
              recommendedLabel={tr('Preporučeno', 'Recommended')}
              recommended
            />
          </SettingsSectionCard>

          <SettingsSectionCard icon={MapPin} title={tr('Lokacija i privatnost', 'Location and privacy')} color="bg-cyan-700 text-white">
            <ToggleRow
              title={tr('Koristi GPS lokaciju', 'Use GPS location')}
              description={tr('Omogućava brže postavljanje polazišta i preciznije procjene.', 'Enables faster pickup setup and more accurate estimates.')}
              enabled={locationPrefs.gps}
              onChange={(v) => {
                if (v) {
                  setGpsConsentOpen(true)
                  return
                }
                const next = { ...locationPrefs, gps: false, gpsPromptSeen: true }
                setLocationPrefs(next)
                savePassengerLocationPrefs(me.account.id, {
                  gps: next.gps,
                  gpsPromptSeen: next.gpsPromptSeen,
                })
                window.dispatchEvent(new CustomEvent('urbanflow:passenger-location-prefs-updated'))
              }}
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
            <button
              type="button"
              className="block text-left text-sm font-semibold text-blue-800 underline decoration-blue-400 underline-offset-2 hover:text-blue-950"
              onClick={() => setPolicyModal(true)}
            >
              {tr('Politika privatnosti', 'Privacy policy')}
            </button>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 flex justify-start gap-2"
              onClick={() => {
                setDeleteHistoryStep(1)
                setDeleteHistoryModal(true)
              }}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              {tr('Obriši historiju', 'Delete history')}
            </Button>
          </SettingsSectionCard>

          <SettingsSectionCard
            id="saved-places"
            icon={Star}
            title={tr('Favoriti i sačuvane lokacije', 'Favorites and saved locations')}
            color="bg-amber-500 text-brand-navy"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <SavedLocationCard
                title={tr('Kuća', 'Home')}
                address={savedLocations.home}
                onEdit={() => {
                  setLocationForm({
                    name: tr('Kuća', 'Home'),
                    address: savedLocations.home,
                    postalCode: homePostalCodeState,
                    type: 'kuca',
                  })
                  setAddLocationModal(true)
                }}
                onUse={() => selectLocationForRide(savedLocations.home)}
                icon={Home}
                editLabel={tr('Uredi', 'Edit')}
                useLabel={tr('Koristi za vožnju', 'Use for ride')}
              />
              <SavedLocationCard
                title={tr('Posao', 'Work')}
                address={savedLocations.work}
                onEdit={() => {
                  setLocationForm({ name: tr('Posao', 'Work'), address: savedLocations.work, postalCode: '', type: 'posao' })
                  setAddLocationModal(true)
                }}
                onUse={() => selectLocationForRide(savedLocations.work)}
                icon={MapPin}
                editLabel={tr('Uredi', 'Edit')}
                useLabel={tr('Koristi za vožnju', 'Use for ride')}
              />
            </div>
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
              <p className="mb-3 font-semibold text-brand-navy">{t.profile.favoritesHeading}</p>
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
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setLocationForm({ name: '', address: '', postalCode: '', type: 'favorit' })
                setAddLocationModal(true)
              }}
            >
              {tr('Dodaj lokaciju', 'Add location')}
            </Button>
          </SettingsSectionCard>

          <SettingsSectionCard icon={Globe2} title={tr('Personalizacija', 'Personalization')} color="bg-indigo-600 text-white">
            <div className="max-w-md space-y-1.5">
              <Label>{tr('Zadani tip vožnje', 'Default ride type')}</Label>
              <select
                className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
                value={defaultRideType}
                onChange={(e) => {
                  const next = e.target.value as 'odmah' | 'zakazi'
                  setDefaultRideType(next)
                  savePassengerPersonalize(me.account.id, {
                    ...loadPassengerPersonalize(me.account.id),
                    defaultRideType: next,
                  })
                }}
              >
                <option value="odmah">{tr('Odmah', 'Now')}</option>
                <option value="zakazi">{tr('Zakaži', 'Schedule')}</option>
              </select>
            </div>
          </SettingsSectionCard>

          <SettingsSectionCard icon={HelpCircle} title={tr('Podrška', 'Support')} color="bg-red-600 text-white">
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
          </SettingsSectionCard>

          <SettingsSectionCard icon={FileText} title={tr('Pravne informacije', 'Legal information')} color="bg-violet-600 text-white">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" className="justify-between" onClick={() => setPolicyModal(true)}>{tr('Politika privatnosti', 'Privacy policy')}<ChevronRight className="h-4 w-4" /></Button>
              <Button variant="secondary" className="justify-between" onClick={() => setTermsModal(true)}>{tr('Uslovi korištenja', 'Terms of use')}<ChevronRight className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm text-slate-600">{tr('Verzija aplikacije', 'App version')}: v1.0.0</p>
          </SettingsSectionCard>

          <LogoutSection
            title={tr('Odjava', 'Logout')}
            description={tr('Odjavite se sa ovog uređaja.', 'Log out from this device.')}
            onLogout={() => out.mutate()}
            ctaLabel={tr('Odjavi se', 'Log out')}
            icon={<LogOut className="mr-2 h-4 w-4" />}
          />
        </CardContent>
      </Card>
      <SimpleModal open={passwordModal} onClose={() => setPasswordModal(false)} title={tr('Promjena lozinke', 'Change password')} closeLabel={tr('Zatvori', 'Close')}>
        <div className="space-y-3">
          <SettingsField label={tr('Trenutna lozinka', 'Current password')} value={passwordForm.current} onChange={(value) => setPasswordForm((prev) => ({ ...prev, current: value }))} type="password" />
          <SettingsField label={tr('Nova lozinka', 'New password')} value={passwordForm.next} onChange={(value) => setPasswordForm((prev) => ({ ...prev, next: value }))} type="password" error={passwordErrors.next} />
          <SettingsField label={tr('Potvrdi novu lozinku', 'Confirm new password')} value={passwordForm.confirm} onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirm: value }))} type="password" error={passwordErrors.confirm} />
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
          <SettingsField label={tr('Naziv lokacije', 'Location name')} value={locationForm.name} onChange={(value) => setLocationForm((prev) => ({ ...prev, name: value }))} />
          <SettingsField label={tr('Adresa', 'Address')} value={locationForm.address} onChange={(value) => setLocationForm((prev) => ({ ...prev, address: value }))} />
          {locationForm.type === 'kuca' ? (
            <SettingsField
              label={tr('Poštanski broj', 'Postal code')}
              value={locationForm.postalCode}
              onChange={(value) => setLocationForm((prev) => ({ ...prev, postalCode: value }))}
            />
          ) : null}
          <div className="space-y-1.5">
            <Label>{tr('Tip', 'Type')}</Label>
            <select
              className="h-11 w-full rounded-xl border border-black/[0.14] bg-white px-3 text-sm font-medium text-brand-navy"
              value={locationForm.type}
              onChange={(e) =>
                setLocationForm((prev) => ({
                  ...prev,
                  type: e.target.value as 'kuca' | 'posao' | 'favorit',
                  postalCode: e.target.value === 'kuca' ? prev.postalCode : '',
                }))
              }
            >
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
      <SimpleModal open={secActivityOpen} onClose={() => setSecActivityOpen(false)} title={tr('Sigurnosne aktivnosti', 'Security activity')} closeLabel={tr('Zatvori', 'Close')}>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex justify-between border-b border-slate-100 pb-1">
            <span>{tr('Prijava', 'Sign-in')}</span>
            <span className="text-slate-500">
              {me.account.lastLoginAt ? new Date(me.account.lastLoginAt).toLocaleString('bs-BA') : '—'}
            </span>
          </li>
          <li className="flex justify-between border-b border-slate-100 pb-1">
            <span>{tr('Aktivna sesija', 'Active session')}</span>
            <span className="text-slate-500">{tr('Ovaj uređaj', 'This device')}</span>
          </li>
        </ul>
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
                    await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
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
      <GpsConsentDialog
        open={gpsConsentOpen}
        onAllow={() => {
          setGpsConsentOpen(false)
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            push(t.order.geoUnsupported, 'error')
            return
          }
          navigator.geolocation.getCurrentPosition(
            () => {
              const next = { gps: true, gpsPromptSeen: true }
              setLocationPrefs((prev) => ({ ...prev, ...next }))
              savePassengerLocationPrefs(me.account.id, next)
              window.dispatchEvent(new CustomEvent('urbanflow:passenger-location-prefs-updated'))
            },
            () => {
              const next = { gps: false, gpsPromptSeen: true }
              setLocationPrefs((prev) => ({ ...prev, ...next }))
              savePassengerLocationPrefs(me.account.id, next)
              window.dispatchEvent(new CustomEvent('urbanflow:passenger-location-prefs-updated'))
              push(t.order.geoDenied, 'error')
            },
            { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
          )
        }}
        onDeny={() => setGpsConsentOpen(false)}
      />
    </div>
  )
}
