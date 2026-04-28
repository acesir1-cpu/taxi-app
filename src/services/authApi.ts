import type { PassengerProfile, UserAccount } from '../types/domain'
import { strings } from '../i18n/strings'
import { delay } from './delay'
import { addNotification } from './notificationApi'
import { getDb, persist } from './mockDb'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function logActivity(accountId: string, description: string, type: 'auth' | 'profile' = 'auth'): void {
  const db = getDb()
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type,
    description,
    createdAt: new Date().toISOString(),
  })
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export async function register(data: RegisterInput): Promise<{ accountId: string } | { error: string }> {
  await delay()
  const db = getDb()
  const email = data.email.trim().toLowerCase()
  const phone = data.phone.trim()
  if (db.users.some((u) => u.email.toLowerCase() === email || u.phone === phone)) {
    return { error: 'exists' }
  }
  const account: UserAccount = {
    id: uid('acc'),
    role: 'putnik',
    email,
    phone,
    passwordPlain: data.password,
    status: 'neaktivan',
    createdAt: new Date().toISOString(),
  }
  const profile: PassengerProfile = {
    id: uid('prof'),
    accountId: account.id,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    registeredAt: account.createdAt,
  }
  db.users.push(account)
  db.profiles.push(profile)
  db.pendingVerificationAccountIds.push(account.id)
  logActivity(account.id, 'Registracija započeta')
  persist()
  return { accountId: account.id }
}

export async function verifyCode(
  accountId: string,
  code: string
): Promise<{ ok: true } | { error: string }> {
  await delay()
  if (code !== '123456') return { error: 'wrong' }
  const db = getDb()
  const user = db.users.find((u) => u.id === accountId)
  if (!user) return { error: 'notfound' }
  user.status = 'aktivan'
  user.verifiedAt = new Date().toISOString()
  db.pendingVerificationAccountIds = db.pendingVerificationAccountIds.filter((id) => id !== accountId)
  db.currentUserId = accountId
  user.lastLoginAt = new Date().toISOString()
  logActivity(accountId, 'Račun verifikovan')
  persist()
  const n = strings().notifications
  await addNotification(accountId, n.inboxAccount, n.accountActivated, 'account')
  return { ok: true }
}

export async function login(
  identifier: string,
  password: string
): Promise<{ ok: true; accountId: string } | { error: string }> {
  await delay()
  const idf = identifier.trim().toLowerCase()
  const db = getDb()
  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === idf ||
      u.phone.replace(/\s/g, '') === identifier.replace(/\s/g, '')
  )
  if (!user || user.passwordPlain !== password) {
    return { error: 'invalid' }
  }
  if (user.status === 'blokiran' || user.status === 'suspendovan') {
    return { error: 'blocked' }
  }
  if (user.status === 'neaktivan') {
    return { error: 'inactive' }
  }
  user.lastLoginAt = new Date().toISOString()
  db.currentUserId = user.id
  logActivity(user.id, 'Prijava')
  persist()
  const na = strings().notifications
  await addNotification(user.id, na.inboxAuth, na.welcomeBack, 'auth')
  return { ok: true, accountId: user.id }
}

export async function googleLogin(): Promise<{ ok: true; accountId: string }> {
  await delay()
  const db = getDb()
  const demo = db.users.find((u) => u.email === 'korisnik@urbanflow.ba')
  if (demo) {
    demo.lastLoginAt = new Date().toISOString()
    db.currentUserId = demo.id
    logActivity(demo.id, 'Google prijava (simulacija)')
    persist()
    const ng = strings().notifications
    await addNotification(demo.id, ng.inboxAuth, ng.googleLoginSimOk, 'auth')
    return { ok: true, accountId: demo.id }
  }
  const account: UserAccount = {
    id: uid('acc'),
    role: 'putnik',
    email: `google.user.${Date.now()}@urbanflow.ba`,
    phone: '+38760000000',
    passwordPlain: '',
    status: 'aktivan',
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
  }
  db.users.push(account)
  db.profiles.push({
    id: uid('prof'),
    accountId: account.id,
    firstName: 'Google',
    lastName: 'Korisnik',
    registeredAt: account.createdAt,
  })
  db.currentUserId = account.id
  persist()
  const ng2 = strings().notifications
  await addNotification(account.id, ng2.inboxAuth, ng2.googleAccountCreatedSim, 'auth')
  return { ok: true, accountId: account.id }
}

export async function logout(): Promise<void> {
  await delay(200)
  const db = getDb()
  db.currentUserId = null
  persist()
}

export async function getCurrentUser(): Promise<{
  account: UserAccount
  profile: PassengerProfile
} | null> {
  await delay(150)
  const db = getDb()
  if (!db.currentUserId) return null
  const account = db.users.find((u) => u.id === db.currentUserId)
  if (!account) {
    db.currentUserId = null
    persist()
    return null
  }
  const profile = db.profiles.find((p) => p.accountId === account.id)
  if (!profile) return null
  return { account, profile }
}

export async function updateProfile(
  accountId: string,
  patch: { email?: string; phone?: string }
): Promise<{ ok: true } | { error: string }> {
  await delay()
  const db = getDb()
  const account = db.users.find((u) => u.id === accountId)
  if (!account) return { error: 'notfound' }
  if (patch.email) account.email = patch.email.trim().toLowerCase()
  if (patch.phone) account.phone = patch.phone.trim()
  logActivity(accountId, 'Ažuriran profil', 'profile')
  persist()
  return { ok: true }
}
