import { create } from 'zustand'
import type { NotificationType } from '../types/notifications'

export interface NotificationBannerPayload {
  id: string
  accountId: string
  title: string
  body: string
  path: string
  notificationType: NotificationType
}

interface BannerState {
  current: NotificationBannerPayload | null
  show: (p: NotificationBannerPayload) => void
  dismiss: () => void
}

export const useNotificationBannerStore = create<BannerState>((set) => ({
  current: null,
  show: (p) => set({ current: p }),
  dismiss: () => set({ current: null }),
}))
