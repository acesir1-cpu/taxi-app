import { driverLsKey } from './driverSettingsLocal'

export type DriverRidePrefsState = {
  defaultRideType: 'odmah' | 'zakazane' | 'obje'
  maxDistanceKm: 1 | 3 | 5 | 10
  preferredZone: 'centar' | 'novo' | 'ilidza' | 'aerodrom' | 'sve'
  acceptScheduled: boolean
  autoNav: boolean
  soundNewRequest: boolean
}

export function defaultRidePrefs(): DriverRidePrefsState {
  return {
    defaultRideType: 'obje',
    maxDistanceKm: 5,
    preferredZone: 'sve',
    acceptScheduled: true,
    autoNav: true,
    soundNewRequest: true,
  }
}

export function loadRidePrefs(accountId: string): DriverRidePrefsState {
  try {
    const r = localStorage.getItem(driverLsKey(accountId, 'ridePrefs'))
    if (!r) return defaultRidePrefs()
    return { ...defaultRidePrefs(), ...JSON.parse(r) }
  } catch {
    return defaultRidePrefs()
  }
}

export function saveRidePrefs(accountId: string, p: DriverRidePrefsState): void {
  localStorage.setItem(driverLsKey(accountId, 'ridePrefs'), JSON.stringify(p))
}

export type DriverNotifyPrefsState = {
  email: boolean
  push: boolean
  security: boolean
  newRideRequests: boolean
  assignmentChanges: boolean
  dispatcherMessages: boolean
  docAlerts: boolean
  shiftAlerts: boolean
  earningsAlerts: boolean
}

export function defaultNotifyPrefs(): DriverNotifyPrefsState {
  return {
    email: true,
    push: true,
    security: true,
    newRideRequests: true,
    assignmentChanges: true,
    dispatcherMessages: true,
    docAlerts: true,
    shiftAlerts: true,
    earningsAlerts: true,
  }
}

export function loadNotifyPrefs(accountId: string): DriverNotifyPrefsState {
  try {
    const r = localStorage.getItem(driverLsKey(accountId, 'notify'))
    if (!r) return defaultNotifyPrefs()
    return { ...defaultNotifyPrefs(), ...JSON.parse(r) }
  } catch {
    return defaultNotifyPrefs()
  }
}

export function saveNotifyPrefs(accountId: string, p: DriverNotifyPrefsState): void {
  localStorage.setItem(driverLsKey(accountId, 'notify'), JSON.stringify(p))
}

export type DriverProfileExtrasState = {
  address: string
  city: string
  appLang: 'bs' | 'en'
}

export function defaultProfileExtras(): DriverProfileExtrasState {
  return {
    address: '',
    city: 'Sarajevo',
    appLang: 'bs',
  }
}

export function loadProfileExtras(accountId: string): DriverProfileExtrasState {
  try {
    const r = localStorage.getItem(driverLsKey(accountId, 'profile'))
    if (!r) return defaultProfileExtras()
    return { ...defaultProfileExtras(), ...JSON.parse(r) }
  } catch {
    return defaultProfileExtras()
  }
}

export function saveProfileExtras(accountId: string, p: DriverProfileExtrasState): void {
  localStorage.setItem(driverLsKey(accountId, 'profile'), JSON.stringify(p))
}

export type DriverSecurityLocalState = {
  twoFactorEnabled: boolean
}

export function defaultSecurityLocal(): DriverSecurityLocalState {
  return { twoFactorEnabled: false }
}

export function loadSecurityLocal(accountId: string): DriverSecurityLocalState {
  try {
    const r = localStorage.getItem(driverLsKey(accountId, 'security'))
    if (!r) return defaultSecurityLocal()
    return { ...defaultSecurityLocal(), ...JSON.parse(r) }
  } catch {
    return defaultSecurityLocal()
  }
}

export function saveSecurityLocal(accountId: string, p: DriverSecurityLocalState): void {
  localStorage.setItem(driverLsKey(accountId, 'security'), JSON.stringify(p))
}
