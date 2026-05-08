import { create } from 'zustand'

export type DriverRideSummaryPayload = {
  routeLabel: string
  price: number
  durationMin: number
  payment: string
}

type State = {
  open: boolean
  summary: DriverRideSummaryPayload | null
  openWith: (summary: DriverRideSummaryPayload) => void
  close: () => void
}

export const useDriverRideSummaryStore = create<State>((set) => ({
  open: false,
  summary: null,
  openWith: (summary) => set({ open: true, summary }),
  close: () => set({ open: false, summary: null }),
}))
