const prefix = 'urbanflow:dispatcher'

function lsKey(accountId: string, key: string): string {
  return `${prefix}:${accountId}:${key}`
}

export type DispatcherNotifyPrefs = {
  rideAlerts: boolean
}

export function defaultDispatcherNotifyPrefs(): DispatcherNotifyPrefs {
  return { rideAlerts: true }
}

export function loadDispatcherNotifyPrefs(accountId: string): DispatcherNotifyPrefs {
  try {
    const raw = localStorage.getItem(lsKey(accountId, 'notify'))
    if (!raw) return defaultDispatcherNotifyPrefs()
    return { ...defaultDispatcherNotifyPrefs(), ...JSON.parse(raw) }
  } catch {
    return defaultDispatcherNotifyPrefs()
  }
}

export function saveDispatcherNotifyPrefs(accountId: string, prefs: DispatcherNotifyPrefs): void {
  localStorage.setItem(lsKey(accountId, 'notify'), JSON.stringify(prefs))
}
