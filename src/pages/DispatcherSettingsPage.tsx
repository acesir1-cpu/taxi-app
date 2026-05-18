import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCircle2, Globe2, LockKeyhole, Monitor, ShieldCheck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountProfileFormFields } from '../components/settings/AccountProfileFormFields'
import { LogoutSection } from '../components/settings/LogoutSection'
import { SettingsSectionCard } from '../components/settings/SettingsSectionCard'
import { ToggleRow } from '../components/settings/ToggleRow'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { getGuestLang, setGuestLang } from '../i18n/guestLocale'
import { strings } from '../i18n/strings'
import { loadDispatcherNotifyPrefs, saveDispatcherNotifyPrefs } from '../lib/dispatcherSettingsPrefs'
import { validateAccountProfile } from '../lib/accountProfileValidation'
import { logout, updateProfile } from '../services/authApi'
import { dispatcherCan, dispatcherRoleLabel } from '../services/dispatcherApi'
import { useToastStore } from '../store/notificationStore'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import type { AccountStatus } from '../types/domain'

export function DispatcherSettingsPage() {
  useLangRefresh()
  const t = strings()
  const d = t.dispatcher.settings
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const { me } = useDispatcherSession()
  const role = me.dispatcherProfile.roleLevel
  const isChief = dispatcherCan(role, 'role_admin')

  const [firstName, setFirstName] = useState(me.dispatcherProfile.firstName)
  const [lastName, setLastName] = useState(me.dispatcherProfile.lastName)
  const [email, setEmail] = useState(me.account.email)
  const [phone, setPhone] = useState(me.account.phone)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lang, setLang] = useState<'bs' | 'en'>(getGuestLang())
  const [notify, setNotify] = useState(() => loadDispatcherNotifyPrefs(me.account.id))

  useEffect(() => {
    setFirstName(me.dispatcherProfile.firstName)
    setLastName(me.dispatcherProfile.lastName)
    setEmail(me.account.email)
    setPhone(me.account.phone)
    setNotify(loadDispatcherNotifyPrefs(me.account.id))
  }, [me.account.id, me.dispatcherProfile.firstName, me.dispatcherProfile.lastName, me.account.email, me.account.phone])

  const saveMut = useMutation({
    mutationFn: () => {
      const nextErrors = validateAccountProfile(
        { firstName, lastName, email, phone, city: '', address: '' },
        lang,
      )
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        throw new Error('validation')
      }
      setErrors({})
      return updateProfile(me.account.id, { firstName, lastName, email, phone })
    },
    onSuccess: async (res) => {
      if ('error' in res) {
        push(t.common.error, 'error')
        return
      }
      setGuestLang(lang)
      saveDispatcherNotifyPrefs(me.account.id, notify)
      push(t.dispatcher.toast.profileSaved, 'success')
      await qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const logoutMut = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate('/welcome', { replace: true })
    },
  })

  const accountStatusLabel =
    t.profile.accountStatus[me.account.status as AccountStatus] ?? me.account.status

  return (
    <div className="space-y-5">
      <SettingsSectionCard icon={User} title={d.profileTitle} color="bg-brand-navy text-white">
        <p className="text-sm text-slate-600">{d.profileHint}</p>
        <AccountProfileFormFields
          values={{ firstName, lastName, email, phone, city: '', address: '' }}
          errors={errors}
          onChange={(patch) => {
            if (patch.firstName !== undefined) setFirstName(patch.firstName)
            if (patch.lastName !== undefined) setLastName(patch.lastName)
            if (patch.email !== undefined) setEmail(patch.email)
            if (patch.phone !== undefined) setPhone(patch.phone)
          }}
          labels={{
            firstName: t.auth.firstName,
            lastName: t.auth.lastName,
            email: t.auth.email,
            phone: t.auth.phone,
            city: '',
            address: '',
          }}
          showCity={false}
          showAddress={false}
        />
        <Button type="button" variant="cta" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {t.profile.save}
        </Button>
      </SettingsSectionCard>

      <SettingsSectionCard icon={Globe2} title={d.languageTitle} color="bg-brand-teal text-white">
        <p className="text-sm text-slate-600">{d.languageHint}</p>
        <select
          className="h-11 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-brand-navy"
          value={lang}
          onChange={(e) => setLang(e.target.value as 'bs' | 'en')}
        >
          <option value="bs">{t.profile.langOptionBs}</option>
          <option value="en">{t.profile.langOptionEn}</option>
        </select>
      </SettingsSectionCard>

      <SettingsSectionCard icon={Bell} title={d.notificationsTitle} color="bg-amber-500 text-brand-navy">
        <ToggleRow
          title={d.notificationsRideAlerts}
          description={d.notificationsRideAlertsDesc}
          enabled={notify.rideAlerts}
          onChange={(rideAlerts) => setNotify((p) => ({ ...p, rideAlerts }))}
        />
        <p className="text-xs font-semibold text-slate-500">{d.notificationsDemo}</p>
        <Button type="button" variant="secondary" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {t.profile.save}
        </Button>
      </SettingsSectionCard>

      <LogoutSection
        title={t.auth.logout}
        description={d.logoutDesc}
        ctaLabel={t.auth.logout}
        loading={logoutMut.isPending}
        onLogout={() => logoutMut.mutate()}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {d.accessTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">{d.dispatcherLabel}</p>
              <p className="mt-1 text-xl font-extrabold text-brand-navy">{me.dispatcherProfile.fullName}</p>
              <p className="mt-1 text-sm text-slate-600">{me.account.email} · {me.account.phone}</p>
            </div>
            <InfoRow label={d.roleLevel} value={dispatcherRoleLabel(role)} />
            <InfoRow label={d.sessionPolicy} value={d.sessionPolicyValue} />
            <InfoRow label={d.accountStatus} value={accountStatusLabel} />
            <div
              className={
                isChief
                  ? 'rounded-2xl border border-brand-yellow/40 bg-brand-yellow/15 p-4 text-sm font-semibold text-brand-navy'
                  : 'rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800'
              }
            >
              {isChief ? d.chiefBanner : d.limitedBanner}
            </div>
          </CardContent>
        </Card>

        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {d.workstationTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {d.workstationItems.map((item) => (
                <li key={item} className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5" />
              {d.securityTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {d.securityItems.map((item) => (
                <li key={item} className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{d.securityDemo}</p>
          </CardContent>
        </Card>

        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle>{d.rolesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <MatrixRow role={d.roleBasic} text={d.roleBasicText} />
            <MatrixRow role={d.roleSenior} text={d.roleSeniorText} />
            <MatrixRow role={d.roleChief} text={d.roleChiefText} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="text-right font-bold text-brand-navy">{value}</span>
    </div>
  )
}

function MatrixRow({ role, text }: { role: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <p className="font-bold text-brand-navy">{role}</p>
      <p className="mt-1 text-slate-600">{text}</p>
    </div>
  )
}
