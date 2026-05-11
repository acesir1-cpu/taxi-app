const keyFor = (accountId: string) => `urbanflow:passenger:${accountId}:mapGuideSeen`

export function hasSeenMapGuide(accountId: string): boolean {
  try {
    return localStorage.getItem(keyFor(accountId)) === 'true'
  } catch {
    return false
  }
}

export function setMapGuideSeen(accountId: string): void {
  try {
    localStorage.setItem(keyFor(accountId), 'true')
  } catch {
    /* ignore */
  }
}
