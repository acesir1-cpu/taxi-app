export interface HistoryPrivacyPrefs {
  saveHistory: boolean
  hideHistoryInApp: boolean
  updatedAt: string
}

const KEY = 'urbanflow_history_privacy_v1'

function loadAll(): Record<string, HistoryPrivacyPrefs> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, HistoryPrivacyPrefs>
  } catch {
    return {}
  }
}

function saveAll(next: Record<string, HistoryPrivacyPrefs>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore quota and private mode errors
  }
}

export function getHistoryPrivacyPrefs(accountId: string): HistoryPrivacyPrefs {
  const all = loadAll()
  return (
    all[accountId] ?? {
      saveHistory: true,
      hideHistoryInApp: false,
      updatedAt: new Date().toISOString(),
    }
  )
}

export function setSaveHistoryPreference(accountId: string, saveHistory: boolean): HistoryPrivacyPrefs {
  const all = loadAll()
  const next: HistoryPrivacyPrefs = {
    ...getHistoryPrivacyPrefs(accountId),
    saveHistory,
    updatedAt: new Date().toISOString(),
  }
  all[accountId] = next
  saveAll(all)
  return next
}

export function clearHistoryInApp(accountId: string): HistoryPrivacyPrefs {
  const all = loadAll()
  const next: HistoryPrivacyPrefs = {
    ...getHistoryPrivacyPrefs(accountId),
    hideHistoryInApp: true,
    updatedAt: new Date().toISOString(),
  }
  all[accountId] = next
  saveAll(all)
  return next
}
