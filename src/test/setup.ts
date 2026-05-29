// Globalni setup za integracijske testove.
// Dodaje jest-dom matchere (npr. toBeInTheDocument) u Vitest `expect`.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Očisti DOM i pohranu poslije svakog testa radi izolacije.
afterEach(() => {
  cleanup()
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
})
