const STORAGE_KEY = 'urbanflow_mock_db_v1'

export function loadRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveRaw(data: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, data)
  } catch {
    /* ignore quota */
  }
}

export const PENDING_VERIFY_KEY = 'urbanflow_pending_verify_account_id'

export function getPendingVerifyAccountId(): string | null {
  try {
    return sessionStorage.getItem(PENDING_VERIFY_KEY)
  } catch {
    return null
  }
}

export function setPendingVerifyAccountId(id: string): void {
  sessionStorage.setItem(PENDING_VERIFY_KEY, id)
}

export function clearPendingVerifyAccountId(): void {
  sessionStorage.removeItem(PENDING_VERIFY_KEY)
}
