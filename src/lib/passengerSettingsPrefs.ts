const PREFIX = 'urbanflow:passenger:'

export function passengerLsKey(accountId: string, part: 'notify' | 'personalize' | 'extras' | 'location'): string {
  return `${PREFIX}${accountId}:${part}`
}

export type PassengerNotifyPrefsState = {
  email: boolean
  push: boolean
  rides: boolean
  promos: boolean
  security: boolean
}

export function defaultPassengerNotifyPrefs(): PassengerNotifyPrefsState {
  return {
    email: true,
    push: true,
    rides: true,
    promos: false,
    security: true,
  }
}

export function loadPassengerNotifyPrefs(accountId: string): PassengerNotifyPrefsState {
  try {
    const r = localStorage.getItem(passengerLsKey(accountId, 'notify'))
    if (!r) return defaultPassengerNotifyPrefs()
    return { ...defaultPassengerNotifyPrefs(), ...JSON.parse(r) }
  } catch {
    return defaultPassengerNotifyPrefs()
  }
}

export function savePassengerNotifyPrefs(accountId: string, p: PassengerNotifyPrefsState): void {
  localStorage.setItem(passengerLsKey(accountId, 'notify'), JSON.stringify(p))
}

export type PassengerPersonalizeState = {
  defaultRideType: 'odmah' | 'zakazi'
  appLang?: 'bs' | 'en'
}

export function defaultPassengerPersonalize(): PassengerPersonalizeState {
  return { defaultRideType: 'odmah', appLang: undefined }
}

export function loadPassengerPersonalize(accountId: string): PassengerPersonalizeState {
  try {
    const r = localStorage.getItem(passengerLsKey(accountId, 'personalize'))
    if (!r) return defaultPassengerPersonalize()
    return { ...defaultPassengerPersonalize(), ...JSON.parse(r) }
  } catch {
    return defaultPassengerPersonalize()
  }
}

export function savePassengerPersonalize(accountId: string, p: PassengerPersonalizeState): void {
  localStorage.setItem(passengerLsKey(accountId, 'personalize'), JSON.stringify(p))
}

export type PassengerSavedLocationsState = {
  home: string
  work: string
  favorites: Array<{ id: string; name: string; address: string }>
}

export type PassengerProfileExtrasState = {
  city: string
  address: string
  avatarDataUrl?: string
  /** Poštanski broj uz kućnu adresu (brza odredišta). */
  homePostalCode?: string
  /** Korisnik je zatvorio modal za kućnu adresu pri prvom pokretanju. */
  homeAddressOnboardingDismissed?: boolean
  savedLocations?: PassengerSavedLocationsState
}

export function defaultPassengerSavedLocations(): PassengerSavedLocationsState {
  return { home: '', work: '', favorites: [] }
}

export function defaultPassengerProfileExtras(): PassengerProfileExtrasState {
  return {
    city: '',
    address: '',
    avatarDataUrl: '',
    homePostalCode: '',
    homeAddressOnboardingDismissed: false,
    savedLocations: defaultPassengerSavedLocations(),
  }
}

function mergeProfileExtras(
  base: PassengerProfileExtrasState,
  raw: Partial<PassengerProfileExtrasState>
): PassengerProfileExtrasState {
  const saved = raw.savedLocations
    ? { ...defaultPassengerSavedLocations(), ...raw.savedLocations }
    : base.savedLocations
  return {
    ...base,
    ...raw,
    savedLocations: saved,
  }
}

export function loadPassengerProfileExtras(accountId: string): PassengerProfileExtrasState {
  try {
    const r = localStorage.getItem(passengerLsKey(accountId, 'extras'))
    if (!r) return defaultPassengerProfileExtras()
    const parsed = JSON.parse(r) as Partial<PassengerProfileExtrasState>
    const merged = mergeProfileExtras(defaultPassengerProfileExtras(), parsed)
    /** Postojeći korisnici bez ključa ne vide ponovo modal. */
    if (parsed.homeAddressOnboardingDismissed === undefined) {
      return { ...merged, homeAddressOnboardingDismissed: true }
    }
    return merged
  } catch {
    return defaultPassengerProfileExtras()
  }
}

export function savePassengerProfileExtras(accountId: string, p: PassengerProfileExtrasState): void {
  localStorage.setItem(passengerLsKey(accountId, 'extras'), JSON.stringify(p))
}

export type PassengerLocationPrefsState = {
  gps: boolean
  gpsPromptSeen: boolean
}

export function defaultPassengerLocationPrefs(): PassengerLocationPrefsState {
  return { gps: true, gpsPromptSeen: false }
}

export function loadPassengerLocationPrefs(accountId: string): PassengerLocationPrefsState {
  try {
    const r = localStorage.getItem(passengerLsKey(accountId, 'location'))
    if (!r) return defaultPassengerLocationPrefs()
    return { ...defaultPassengerLocationPrefs(), ...JSON.parse(r) }
  } catch {
    return defaultPassengerLocationPrefs()
  }
}

export function savePassengerLocationPrefs(accountId: string, p: PassengerLocationPrefsState): void {
  localStorage.setItem(passengerLsKey(accountId, 'location'), JSON.stringify(p))
}
