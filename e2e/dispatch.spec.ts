import { test, expect } from '@playwright/test'

// E2E test dispečerskog toka — prijava i pristup konzoli.
test.describe('Modul 4 — Dispečerski tok (E2E)', () => {
  test('TC_DISPATCH_001 — prijava dispečera i pristup panelu', async ({ page }) => {
    await page.goto('/login')
    // Prebaci na ulogu "Dispečer" (RoleToggle) → polja se popune demo dispečerom.
    await page.getByText('Dispečer', { exact: true }).click()
    await page.getByRole('button', { name: 'Prijavi se kao dispečer' }).click()
    await expect(page).toHaveURL(/\/dispatch/)
    await page.screenshot({ path: 'UAT/dokazi/TC_DISPATCH_001_Pristup_panelu.png', fullPage: true })
  })
})
