import { test, expect } from '@playwright/test'

// E2E testovi autentifikacije i kontrole pristupa po ulozi.
// Napomena: aplikacija na ekranu prijave unaprijed popunjava demo podatke,
// a dugme za putnika nosi tekst "Započni vožnju".
test.describe('Modul 1 — Autentifikacija (E2E)', () => {
  test('TC_AUTH_006 — uspješna prijava putnika', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Započni vožnju' }).click()
    await expect(page).toHaveURL(/\/app\/order/)
    await page.screenshot({ path: 'UAT/dokazi/TC_AUTH_006_Prijava_validna.png', fullPage: true })
  })

  test('TC_AUTH_007 — prijava s neispravnim podacima', async ({ page }) => {
    await page.goto('/login')
    const password = page.getByPlaceholder('Lozinka')
    await password.fill('pogresna123')
    await page.getByRole('button', { name: 'Započni vožnju' }).click()
    await expect(page.getByText('Neispravni podaci za prijavu.')).toBeVisible()
    await page.screenshot({ path: 'UAT/dokazi/TC_AUTH_007_Prijava_neispravna.png', fullPage: true })
  })

  test('TC_AUTH_014 — gost nema pristup zaštićenom sadržaju', async ({ page }) => {
    // Neautentificiran ulaz u aplikaciju (root) → guard preusmjerava na /welcome.
    await page.goto('/')
    await expect(page).toHaveURL(/\/welcome/)
    await page.screenshot({ path: 'UAT/dokazi/TC_AUTH_014_Gost_bez_pristupa.png', fullPage: true })
  })
})
