import { createFreshSeed } from '../data/seed'
import type { MockDatabase } from '../types/domain'
import { loadRaw, saveRaw } from '../utils/storage'

let memory: MockDatabase | null = null

export function getDb(): MockDatabase {
  if (memory) return memory
  const raw = loadRaw()
  if (raw) {
    try {
      memory = JSON.parse(raw) as MockDatabase
      return memory
    } catch {
      memory = createFreshSeed()
      persist()
      return memory
    }
  }
  memory = createFreshSeed()
  persist()
  return memory
}

export function persist(): void {
  if (!memory) return
  saveRaw(JSON.stringify(memory))
}

export function resetDb(): void {
  memory = createFreshSeed()
  persist()
}

export function replaceDb(next: MockDatabase): void {
  memory = next
  persist()
}
