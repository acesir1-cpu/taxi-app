import type { Complaint, ComplaintCategory } from '../types/domain'
import { delay } from './delay'
import { addNotification } from './notificationApi'
import { getDb, persist } from './mockDb'

function uid(): string {
  return `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createComplaint(
  rideId: string,
  accountId: string,
  category: ComplaintCategory,
  description: string
): Promise<{ ok: true; complaint: Complaint } | { error: string }> {
  await delay()
  const desc = description.trim()
  if (!desc) return { error: 'empty' }
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'noride' }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  if (db.complaints.some((c) => c.rideId === rideId && c.submittedByAccountId === accountId)) {
    return { error: 'duplicate' }
  }
  const complaint: Complaint = {
    id: uid(),
    rideId,
    submittedByAccountId: accountId,
    category,
    description: desc,
    status: 'zaprimljena',
    createdAt: new Date().toISOString(),
  }
  db.complaints.push(complaint)
  db.activityLogs.unshift({
    id: `log-${complaint.id}`,
    accountId,
    type: 'complaint',
    description: `Prijava problema za vožnju ${rideId}`,
    createdAt: new Date().toISOString(),
  })
  persist()
  await addNotification(accountId, 'inboxComplaint', 'complaintOk', 'complaint')
  return { ok: true, complaint }
}

export async function getComplaintsForPassenger(accountId: string): Promise<Complaint[]> {
  await delay()
  const db = getDb()
  return db.complaints.filter((c) => c.submittedByAccountId === accountId)
}
