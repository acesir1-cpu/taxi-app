import { test, expect, type Page } from '@playwright/test'

// E2E "simulacija" vozačkog toka — TABLET prikaz, ljudski tempo:
//   početni ekran → prijava kao vozač → "Započni smjenu" → stiže ISTI zahtjev kao s korisničke strane
//   (Grbavica → Dobrinja) → vozač PRIHVATI → vožnja počinje (vozač na putu).
// Snima VIDEO (video: 'on') sve do trenutka kad je vožnja prihvaćena i započela.
// Interni test panel ("kontrole na kraju stranice") je sakriven da se ne vidi u snimku.
// Pokretanje:  npm run e2e -- driver-flow      ·   izvještaj (video + trace):  npm run e2e:report

// Demo vozač (Amir K.) — isti podaci kao u mock bazi (src/data/seed.ts).
const DRIVER_ACCOUNT_ID = 'acc-driver-demo-1'
const MOCK_DB_KEY = 'urbanflow_mock_db_v1'

// ISTA vožnja kao na korisničkoj strani (Grbavica → Dobrinja, putnik Lejla H.).
const SAME_RIDE = {
  pickup: { id: 'loc-grbavica', label: 'Grbavica', address: 'Grbavica, Sarajevo', lat: 43.8497, lng: 18.3892, zoneId: 'sarajevo_core' },
  destination: { id: 'loc-dobrinja', label: 'Dobrinja', address: 'Dobrinja, Sarajevo', lat: 43.8281, lng: 18.3512, zoneId: 'sarajevo_core' },
  passengerName: 'Lejla H.',
  distanceToPassengerKm: 1.2,
  routeDistanceKm: 5.8,
  etaToPickupMin: 3,
  estimatedDurationMin: 14,
  estimatedPrice: 11.65,
  paymentMethod: 'gotovina',
  type: 'odmah',
  status: 'ponudjen',
}

// Predah između faza (ms) — da se snimak prati kao da vozač gleda ekran.
const BEAT = 1400

// Tablet (iPad Pro landscape) — dovoljno visok da ključne kartice stanu bez skrolanja.
test.use({
  viewport: { width: 1366, height: 1024 },
  hasTouch: true,
  isMobile: false,
  video: 'on',
  trace: 'on',
  launchOptions: { slowMo: 700 },
})

/** Sakrij interni test panel ("Interni test scenariji") da se ne vidi u snimku. */
function hideDriverDemoPanel(page: Page) {
  return page.addInitScript(() => {
    const hide = () => {
      const spans = Array.from(document.querySelectorAll('span'))
      for (const s of spans) {
        if (s.textContent && s.textContent.trim().startsWith('Interni test scenariji')) {
          let node: HTMLElement | null = s.parentElement
          while (node && node !== document.body && !(typeof node.className === 'string' && node.className.includes('backdrop-blur-xl'))) {
            node = node.parentElement
          }
          if (node && node !== document.body) node.style.display = 'none'
        }
      }
    }
    const start = () => {
      hide()
      new MutationObserver(hide).observe(document.body, { childList: true, subtree: true })
    }
    if (document.body) start()
    else window.addEventListener('DOMContentLoaded', start)
  })
}

/**
 * Vozaču unaprijed postavi ISTI zahtjev koji je putnik poslao (Grbavica → Dobrinja). Pošto
 * `driverStartShift` ne prepisuje već postojeći zahtjev, kasniji klik "Započni smjenu" zadržava ovaj.
 * Vozački UI nastaje tek pri prvom učitavanju dashboarda, pa čekamo da se pohrani, ubacimo zahtjev i
 * jednom osvježimo — odmah po prijavi, prije ijedne vozačeve akcije.
 */
async function injectSameRideRequest(page: Page) {
  await page.waitForFunction(
    ({ key, acc }) => {
      const raw = localStorage.getItem(key)
      if (!raw) return false
      try {
        const db = JSON.parse(raw)
        return !!db.driverUiByAccountId && !!db.driverUiByAccountId[acc]
      } catch {
        return false
      }
    },
    { key: MOCK_DB_KEY, acc: DRIVER_ACCOUNT_ID },
    { timeout: 15_000 }
  )
  await page.evaluate(
    ({ key, acc, ride }) => {
      const db = JSON.parse(localStorage.getItem(key) as string)
      db.driverUiByAccountId[acc].pendingRequest = {
        ...ride,
        id: `req-driver-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem(key, JSON.stringify(db))
    },
    { key: MOCK_DB_KEY, acc: DRIVER_ACCOUNT_ID, ride: SAME_RIDE }
  )
  await page.reload()
}

test.describe('Simulacija (tablet) — vozač počinje smjenu, dobija i prihvata zahtjev (E2E)', () => {
  test('TC_SIM_DRV_001 — vozač se prijavi, započne smjenu, primi isti zahtjev i započne vožnju', async ({ page }) => {
    // Tempo je usporen (slowMo + pauze), pa dižemo limit iznad podrazumijevanih 30s.
    test.setTimeout(120_000)
    await hideDriverDemoPanel(page)

    // 1) POČETNI EKRAN.
    await page.goto('/welcome')
    await expect(page.getByRole('button', { name: 'Započni vožnju' })).toBeVisible()
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_DRV_001_a_Pocetni_ekran.png', fullPage: true })

    // 2) Odlazak na prijavu i odabir uloge "Vozač" (polja se popune demo vozačem).
    await page.getByRole('button', { name: 'Započni vožnju' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.getByRole('tab', { name: 'Vozač' }).click()
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_DRV_001_b_Prijava_vozac.png', fullPage: true })

    // 3) Prijava vozača + priprema ISTOG zahtjeva (osvježavanje odmah po prijavi, prije ijedne akcije).
    await page.getByRole('button', { name: 'Prijava (Vozač)' }).click()
    await expect(page).toHaveURL(/\/driver/)
    await injectSameRideRequest(page)
    await expect(page).toHaveURL(/\/driver/)

    // 4) Vozač je "Van smjene" — vidi se dugme za početak smjene (stranica ostaje na vrhu).
    const startShift = page.getByRole('button', { name: 'Započni smjenu' })
    await expect(startShift).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_DRV_001_c_Van_smjene.png', fullPage: true })

    // 5) Vozač počinje smjenu → status "Dostupan" i ponuda postaje aktivna.
    await startShift.click()

    // 6) Stigao je ISTI zahtjev (Grbavica → Dobrinja, putnik Lejla H.) — "NOVO" + Prihvati.
    const accept = page.getByRole('button', { name: 'Prihvati' })
    await expect(accept).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('NOVO')).toBeVisible()
    await expect(page.getByText('Dobrinja').first()).toBeVisible()
    await expect(page.getByText('Dostupan').first()).toBeVisible()
    // Pusti da se kartica i karta slegnu prije snimka (bez skrolanja).
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_DRV_001_d_Novi_zahtjev.png', fullPage: true })

    // 7) Vozač PRIHVATA vožnju.
    await accept.click()

    // 8) Vožnja je počela — status "Zauzet", tok vožnje aktivan (vozač na putu do putnika).
    const arrived = page.getByRole('button', { name: 'Stigao na lokaciju' })
    await expect(arrived).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Zauzet').first()).toBeVisible()
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_DRV_001_e_Voznja_pocela.png', fullPage: true })
  })
})
