import type { AuthSession, PassengerProfile, UserAccount, UserRole } from '../types/domain'
import { DEMO_DRIVER_ACCOUNT_ID } from '../data/seed'
import { delay } from './delay'
import { appendNotification } from './notificationApi'
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
  await appendNotification({
    accountId: account.id,
    type: 'SYSTEM_MESSAGE',
    title: 'Račun kreiran',
    body: 'Vaš račun je kreiran. Dovršite verifikaciju.',
    targetApp: 'passenger',
    showBanner: false,
  })
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
  await appendNotification({
    accountId,
    type: 'SYSTEM_MESSAGE',
    title: 'Račun aktiviran',
    body: 'Vaš račun je sada aktivan.',
    targetApp: 'passenger',
    showBanner: false,
  })
  return { ok: true }
}

export async function login(
  identifier: string,
  password: string
): Promise<{ ok: true; accountId: string; role: UserRole } | { error: string }> {
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
  logActivity(user.id, user.role === 'vozac' ? 'Prijava vozača' : 'Prijava')
  persist()
  await appendNotification({
    accountId: user.id,
    type: 'ACCOUNT_LOGIN',
    title: 'Nova prijava',
    body: 'Prijava uspješna. Dobrodošli nazad u UrbanFlow Taxi.',
    targetApp: user.role === 'vozac' ? 'driver' : 'passenger',
    showBanner: false,
  })
  return { ok: true, accountId: user.id, role: user.role }
}

export async function driverDemoLogin(): Promise<{ ok: true; accountId: string; role: UserRole } | { error: string }> {
  await delay()
  const db = getDb()
  const user = db.users.find((u) => u.id === DEMO_DRIVER_ACCOUNT_ID)
  if (!user || user.role !== 'vozac') {
    return { error: 'notfound' }
  }
  if (user.status === 'blokiran' || user.status === 'suspendovan') {
    return { error: 'blocked' }
  }
  user.lastLoginAt = new Date().toISOString()
  db.currentUserId = user.id
  logActivity(user.id, 'Prijava vozača')
  persist()
  await appendNotification({
    accountId: user.id,
    type: 'ACCOUNT_LOGIN',
    title: 'Nova prijava',
    body: 'Prijava uspješna. Dobrodošli nazad u UrbanFlow Taxi.',
    targetApp: 'driver',
    showBanner: false,
  })
  return { ok: true, accountId: user.id, role: 'vozac' }
}

export async function googleLogin(): Promise<{ ok: true; accountId: string; role: UserRole }> {
  await delay()
  const db = getDb()
  const demo = db.users.find((u) => u.email === 'korisnik@urbanflow.ba')
  if (demo) {
    demo.lastLoginAt = new Date().toISOString()
    db.currentUserId = demo.id
    logActivity(demo.id, 'Google prijava (simulacija)')
    persist()
    await appendNotification({
      accountId: demo.id,
      type: 'ACCOUNT_LOGIN',
      title: 'Nova prijava',
      body: 'Google prijava uspješna. Dobrodošli nazad u UrbanFlow Taxi.',
      targetApp: demo.role === 'vozac' ? 'driver' : 'passenger',
      showBanner: false,
    })
    return { ok: true, accountId: demo.id, role: demo.role }
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
  await appendNotification({
    accountId: account.id,
    type: 'ACCOUNT_LOGIN',
    title: 'Nova prijava',
    body: 'Google prijava uspješna. Dobrodošli nazad u UrbanFlow Taxi.',
    targetApp: 'passenger',
    showBanner: false,
  })
  return { ok: true, accountId: account.id, role: account.role }
}

export async function logout(): Promise<void> {
  await delay(200)
  const db = getDb()
  db.currentUserId = null
  persist()
}

export async function getCurrentUser(): Promise<AuthSession | null> {
  await delay(150)
  const db = getDb()
  if (!db.currentUserId) return null
  const account = db.users.find((u) => u.id === db.currentUserId)
  if (!account) {
    db.currentUserId = null
    persist()
    return null
  }
  if (account.role === 'vozac') {
    const driverProfile = db.driverProfiles.find((p) => p.accountId === account.id)
    if (!driverProfile) return null
    return { kind: 'driver', account, driverProfile }
  }
  const profile = db.profiles.find((p) => p.accountId === account.id)
  if (!profile) return null
  return { kind: 'passenger', account, profile }
}

export async function updateProfile(
  accountId: string,
  patch: { firstName?: string; lastName?: string; email?: string; phone?: string }
): Promise<{ ok: true } | { error: string }> {
  await delay()
  const db = getDb()
  const account = db.users.find((u) => u.id === accountId)
  if (!account) return { error: 'notfound' }
  if (account.role === 'vozac') {
    const dp = db.driverProfiles.find((p) => p.accountId === accountId)
    if (!dp) return { error: 'notfound' }
    if (patch.firstName) {
      dp.firstName = patch.firstName.trim()
      dp.fullName = `${dp.firstName} ${dp.lastName}`.trim()
    }
    if (patch.lastName) {
      dp.lastName = patch.lastName.trim()
      dp.fullName = `${dp.firstName} ${dp.lastName}`.trim()
    }
    if (patch.email) {
      account.email = patch.email.trim().toLowerCase()
      dp.email = account.email
    }
    if (patch.phone) {
      account.phone = patch.phone.trim()
      dp.phone = account.phone
    }
    logActivity(accountId, 'Ažuriran profil vozača', 'profile')
    persist()
    await appendNotification({
      accountId,
      type: 'ACCOUNT_UPDATE',
      title: 'Profil ažuriran',
      body: 'Vaši podaci su uspješno promijenjeni.',
      targetApp: 'driver',
      showBanner: false,
    })
    return { ok: true }
  }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile) return { error: 'notfound' }
  if (patch.firstName) profile.firstName = patch.firstName.trim()
  if (patch.lastName) profile.lastName = patch.lastName.trim()
  if (patch.email) account.email = patch.email.trim().toLowerCase()
  if (patch.phone) account.phone = patch.phone.trim()
  logActivity(accountId, 'Ažuriran profil', 'profile')
  persist()
  await appendNotification({
    accountId,
    type: 'ACCOUNT_UPDATE',
    title: 'Profil ažuriran',
    body: 'Vaši podaci su uspješno promijenjeni.',
    targetApp: 'passenger',
    showBanner: false,
  })
  return { ok: true }
}
