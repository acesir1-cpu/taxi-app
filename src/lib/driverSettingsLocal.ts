const PREFIX = 'urbanflow:driver:'

export function driverLsKey(accountId: string, part: 'profile' | 'notify' | 'ridePrefs' | 'security'): string {
  return `${PREFIX}${accountId}:${part}`
}

export function clearDriverSettingsLocalStorage(accountId: string): void {
  try {
    ;(['profile', 'notify', 'ridePrefs', 'security'] as const).forEach((part) => {
      localStorage.removeItem(driverLsKey(accountId, part))
    })
  } catch {
    /* ignore */
  }
}
