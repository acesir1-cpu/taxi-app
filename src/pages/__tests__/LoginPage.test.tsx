import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '../LoginPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { resetDb } from '../../services/mockDb'
import { strings } from '../../i18n/strings'

const t = strings()

beforeEach(() => {
  // Svjež seed (postoji demo putnik korisnik@urbanflow.ba / Test12345).
  localStorage.clear()
  resetDb()
})

describe('Modul 1 — Autentifikacija (integracijski testovi)', () => {
  // Polja su unaprijed popunjena demo podacima; dugme za putnika nosi tekst t.welcome.login.
  it('TC_AUTH_007 — pogrešna lozinka prikazuje grešku "Neispravni podaci za prijavu."', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const password = screen.getByPlaceholderText(t.auth.password)
    await user.clear(password)
    await user.type(password, 'pogresna123')
    await user.click(screen.getByRole('button', { name: t.welcome.login }))

    expect(await screen.findByText(t.auth.invalidCreds, {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('TC_AUTH_003 — prazna obavezna polja prikazuju validacijsku poruku', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.clear(screen.getByPlaceholderText(t.auth.loginIdentifierLabel))
    await user.clear(screen.getByPlaceholderText(t.auth.password))
    await user.click(screen.getByRole('button', { name: t.welcome.login }))

    const errors = await screen.findAllByText(t.auth.validation.required)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('TC_AUTH_006 — validni demo podaci ne prikazuju grešku prijave', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    // Demo polja su već popunjena (korisnik@urbanflow.ba / Test12345) → samo potvrdi.
    await user.click(screen.getByRole('button', { name: t.welcome.login }))

    // Greška se NE smije pojaviti za validne podatke.
    await new Promise((r) => setTimeout(r, 1200))
    expect(screen.queryByText(t.auth.invalidCreds)).not.toBeInTheDocument()
  })
})
