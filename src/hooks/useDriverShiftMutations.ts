import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  driverEndShift,
  driverPause,
  driverResume,
  driverStartShift,
} from '../services/driverSessionApi'
import { useToastStore } from '../store/notificationStore'

export function useDriverShiftMutations(accountId: string) {
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)

  const startMut = useMutation({
    mutationFn: () => driverStartShift(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Smjena započeta. GPS lokacija evidentirana.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const pauseMut = useMutation({
    mutationFn: () => driverPause(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Status promijenjen: Pauza.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const resumeMut = useMutation({
    mutationFn: () => driverResume(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Nastavak smjene — ponovo ste dostupni.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const endMut = useMutation({
    mutationFn: () => driverEndShift(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Smjena završena.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  return { startMut, pauseMut, resumeMut, endMut }
}
