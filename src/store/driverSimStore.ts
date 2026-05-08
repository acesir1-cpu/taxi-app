import { create } from 'zustand'

export type DriverSimSpeed = 1 | 2 | 4 | 10

interface DriverSimState {
  simSpeed: DriverSimSpeed
  speedCooldownUntil: number
  setSimSpeed: (s: DriverSimSpeed) => void
}

export const useDriverSimStore = create<DriverSimState>((set, get) => ({
  simSpeed: 1,
  speedCooldownUntil: 0,
  setSimSpeed: (s) => {
    const now = Date.now()
    if (now < get().speedCooldownUntil) return
    if (s === get().simSpeed) return
    /** Kratki debounce (ms) da se izbjegne dupli klik; bez dugog čekanja kao prije. */
    set({ simSpeed: s, speedCooldownUntil: now + 350 })
  },
}))
