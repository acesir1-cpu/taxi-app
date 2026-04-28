const KEY = 'hasSeenMapGuide'

export function hasSeenMapGuide(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    /* Ako LS nije dostupan, tretiraj kao da vodič nije viđen — prikaži upute. */
    return false
  }
}

export function setMapGuideSeen(): void {
  try {
    localStorage.setItem(KEY, 'true')
  } catch {
    /* ignore */
  }
}
