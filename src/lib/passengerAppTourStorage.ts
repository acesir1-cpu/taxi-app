const keyFor = (accountId: string) => `urbanflow:passenger:${accountId}:appTourDone`

export function hasCompletedPassengerAppTour(accountId: string): boolean {
  try {
    return localStorage.getItem(keyFor(accountId)) === 'true'
  } catch {
    return false
  }
}

export function setPassengerAppTourCompleted(accountId: string): void {
  try {
    localStorage.setItem(keyFor(accountId), 'true')
  } catch {
    /* ignore */
  }
}
