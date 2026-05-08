import type { DriverAvatarPendingRequest } from '../types/domain'
import { delay } from './delay'
import { addNotificationRaw } from './notificationApi'
import { getDb, persist } from './mockDb'

function rid(): string {
  return `avp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getDriverAvatarUrlSync(driverId: string): string | undefined {
  return getDb().drivers.find((d) => d.id === driverId)?.avatarUrl
}

export function getPendingAvatarRequestForDriver(driverId: string): DriverAvatarPendingRequest | undefined {
  return getDb().driverAvatarPendingRequests.find((r) => r.driverId === driverId && r.status === 'pending')
}

export function listPendingDriverAvatarRequests(): DriverAvatarPendingRequest[] {
  return getDb()
    .driverAvatarPendingRequests.filter((r) => r.status === 'pending')
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export async function submitDriverAvatarPending(input: {
  accountId: string
  driverId: string
  dataUrl: string
}): Promise<{ ok: true } | { error: string }> {
  await delay(180)
  const db = getDb()
  if (!input.dataUrl.startsWith('data:image/')) {
    return { error: 'invalid_image' }
  }
  db.driverAvatarPendingRequests = db.driverAvatarPendingRequests.filter(
    (r) => !(r.driverId === input.driverId && r.status === 'pending'),
  )
  db.driverAvatarPendingRequests.push({
    id: rid(),
    driverId: input.driverId,
    driverAccountId: input.accountId,
    proposedDataUrl: input.dataUrl,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  })
  persist()
  window.dispatchEvent(new CustomEvent('urbanflow:driver-avatar-pending-updated', { detail: { driverId: input.driverId } }))
  return { ok: true }
}

export async function approveDriverAvatarRequest(requestId: string): Promise<{ ok: true } | { error: string }> {
  await delay(220)
  const db = getDb()
  const req = db.driverAvatarPendingRequests.find((r) => r.id === requestId && r.status === 'pending')
  if (!req) return { error: 'not_found' }
  const driver = db.drivers.find((d) => d.id === req.driverId)
  if (!driver) return { error: 'no_driver' }
  driver.avatarUrl = req.proposedDataUrl
  req.status = 'approved'
  persist()
  window.dispatchEvent(new CustomEvent('urbanflow:driver-avatar-updated', { detail: { driverId: req.driverId } }))
  await addNotificationRaw(
    req.driverAccountId,
    'Profilna fotografija odobrena',
    'Administrator je odobrio vašu novu profilnu fotografiju. Ona je sada vidljiva putnicima i u aplikaciji.',
    'account',
  )
  return { ok: true }
}

export async function rejectDriverAvatarRequest(
  requestId: string,
  note?: string,
): Promise<{ ok: true } | { error: string }> {
  await delay(220)
  const db = getDb()
  const req = db.driverAvatarPendingRequests.find((r) => r.id === requestId && r.status === 'pending')
  if (!req) return { error: 'not_found' }
  req.status = 'rejected'
  if (note?.trim()) req.adminNote = note.trim()
  persist()
  window.dispatchEvent(new CustomEvent('urbanflow:driver-avatar-pending-updated', { detail: { driverId: req.driverId } }))
  const body = note?.trim()
    ? `Administrator je odbio zahtjev. Napomena: ${note.trim()}`
    : 'Administrator je odbio zahtjev za novu profilnu fotografiju. Možete poslati drugu sliku koja poštuje pravila zajednice.'
  await addNotificationRaw(req.driverAccountId, 'Profilna fotografija nije odobrena', body, 'account')
  return { ok: true }
}
