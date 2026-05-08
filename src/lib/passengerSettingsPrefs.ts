const PREFIX = 'urbanflow:passenger:'

export function passengerLsKey(accountId: string, part: 'notify' | 'personalize' | 'extras'): string {
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

export type PassengerProfileExtrasState = {
  city: string
  address: string
  avatarDataUrl?: string
  savedLocations?: {
    home: string
    work: string
    favorites: Array<{ id: string; name: string; address: string }>
  }
}

export function defaultPassengerProfileExtras(): PassengerProfileExtrasState {
  return {
    city: '',
    address: '',
    avatarDataUrl: '',
    savedLocations: {
      home: 'Ul. Zmaja od Bosne 12, Sarajevo',
      work: 'Trg djece Sarajeva 5, Sarajevo',
      favorites: [
        { id: 'fav-1', name: 'Aerodrom', address: 'Kurta Schorka 36, Sarajevo' },
        { id: 'fav-2', name: 'BCC', address: 'Branilaca Sarajeva 20, Sarajevo' },
      ],
    },
  }
}

export function loadPassengerProfileExtras(accountId: string): PassengerProfileExtrasState {
  try {
    const r = localStorage.getItem(passengerLsKey(accountId, 'extras'))
    if (!r) return defaultPassengerProfileExtras()
    return { ...defaultPassengerProfileExtras(), ...JSON.parse(r) }
  } catch {
    return defaultPassengerProfileExtras()
  }
}

export function savePassengerProfileExtras(accountId: string, p: PassengerProfileExtrasState): void {
  localStorage.setItem(passengerLsKey(accountId, 'extras'), JSON.stringify(p))
}
