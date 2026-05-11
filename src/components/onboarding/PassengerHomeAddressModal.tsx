import { useState } from 'react'
import { createPortal } from 'react-dom'
import { strings } from '../../i18n/strings'
import {
  defaultPassengerSavedLocations,
  loadPassengerProfileExtras,
  savePassengerProfileExtras,
} from '../../lib/passengerSettingsPrefs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function PassengerHomeAddressModal({
  open,
  accountId,
  onClose,
}: {
  open: boolean
  accountId: string
  onClose: () => void
}) {
  const t = strings()
  const [address, setAddress] = useState('')
  const [postal, setPostal] = useState('')

  function dismissLater() {
    const cur = loadPassengerProfileExtras(accountId)
    savePassengerProfileExtras(accountId, {
      ...cur,
      homeAddressOnboardingDismissed: true,
    })
    window.dispatchEvent(new CustomEvent('urbanflow:passenger-profile-extras-updated'))
    onClose()
  }

  function save() {
    const cur = loadPassengerProfileExtras(accountId)
    const saved = cur.savedLocations ?? defaultPassengerSavedLocations()
    savePassengerProfileExtras(accountId, {
      ...cur,
      savedLocations: { ...saved, home: address.trim() },
      homePostalCode: postal.trim(),
      homeAddressOnboardingDismissed: true,
    })
    window.dispatchEvent(new CustomEvent('urbanflow:passenger-profile-extras-updated'))
    onClose()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[480] flex items-end bg-slate-950/40 px-4 pb-4 backdrop-blur-sm sm:items-center sm:justify-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-onboarding-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-2xl">
        <h2 id="home-onboarding-title" className="text-lg font-extrabold tracking-tight text-brand-navy">
          {t.onboarding.homeTitle}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{t.onboarding.homeBody}</p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="home-onb-addr">{t.onboarding.homeAddressLabel}</Label>
            <Input
              id="home-onb-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.order.addressPlaceholder}
              autoComplete="street-address"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="home-onb-postal">{t.onboarding.homePostalLabel}</Label>
            <Input
              id="home-onb-postal"
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              placeholder="71000"
              autoComplete="postal-code"
            />
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <Button type="button" className="w-full" onClick={save}>
            {t.onboarding.homeSave}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={dismissLater}>
            {t.onboarding.homeLater}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
