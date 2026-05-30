import { test, expect, type Page, type Locator } from '@playwright/test'

// E2E "simulacija" cijelog korisničkog toka — MOBILNI prikaz, ljudski tempo:
//   početni ekran (welcome) → prijava → unos polazišta i odredišta → potvrda → traženje vozača.
// Svi uvodni tutorijali (kućna adresa, vodič kroz aplikaciju, vodič za kartu, GPS) su preskočeni
// kao da je korisnik već ranije bio prijavljen. Nema ponovnog učitavanja usred toka.
// Test snima VIDEO (video: 'on') i pravi screenshotove kao dokaz.
// Pokretanje:  npm run e2e -- order-flow      ·   izvještaj (video + trace):  npm run e2e:report

// Demo putnik (Lejla) — isti podaci kao u mock bazi (src/data/seed.ts).
const PASSENGER_ACCOUNT_ID = 'acc-demo-lejla'
const PASSENGER_PROFILE_ID = 'prof-demo-lejla'
const MOCK_DB_KEY = 'urbanflow_mock_db_v1'

// Lokalne lokacije iz seed-a (MOCK_LOCATIONS) — bez ovisnosti o mreži (geokodiranju).
const PICKUP_QUERY = 'Grbavica'
const DESTINATION_QUERY = 'Dobrinja'

// Predah između faza (ms) — da se snimak prati kao da korisnik razmišlja i gleda ekran.
const BEAT = 1400
// Brzina kucanja po slovu (ms) — kao da korisnik stvarno tipka.
const TYPE_DELAY = 110

// Mobilni prikaz, video + trace, te usporeni klikovi (slowMo) radi ljudskog tempa.
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  video: 'on',
  trace: 'on',
  launchOptions: { slowMo: 700 },
})

/** Svi uvodni tutorijali + GPS dijalog su unaprijed "viđeni" — korisnik kao da je već bio prijavljen. */
function disableOnboarding(page: Page) {
  return page.addInitScript((accountId: string) => {
    const p = `urbanflow:passenger:${accountId}:`
    localStorage.setItem(`${p}appTourDone`, 'true')
    localStorage.setItem(`${p}mapGuideSeen`, 'true')
    localStorage.setItem(`${p}extras`, JSON.stringify({ homeAddressOnboardingDismissed: true }))
    // GPS isključen + prompt već viđen → nema dijaloga niti čekanja geolokacije.
    localStorage.setItem(`${p}location`, JSON.stringify({ gps: false, gpsPromptSeen: true }))
  }, PASSENGER_ACCOUNT_ID)
}

/** Demo putnik u seed-u već ima aktivnu vožnju ('dodijeljena') koja blokira novo naručivanje — zatvaramo je. */
async function clearActiveRideForDemoPassenger(page: Page) {
  await page.evaluate(
    ({ key, profileId }) => {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const db = JSON.parse(raw)
      const blocking = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku']
      for (const ride of db.rides ?? []) {
        if (ride.passengerId === profileId && blocking.includes(ride.status)) {
          ride.status = 'zavrsena'
        }
      }
      localStorage.setItem(key, JSON.stringify(db))
    },
    { key: MOCK_DB_KEY, profileId: PASSENGER_PROFILE_ID }
  )
}

/**
 * Glatko doskroluje element u vidno polje SAMO unutar ploče (najbliži scrollable roditelj).
 * Animacija se ručno raspoređuje kroz requestAnimationFrame (easeInOut) jer CSS `behavior:'smooth'`
 * u automatizovanom Chromiumu često odradi skok u jednom frejmu (izgleda zamrznuto, ne glatko).
 */
async function smoothReveal(page: Page, locator: Locator, block: 'start' | 'center' | 'end' = 'center') {
  await locator.evaluate((el, b) => {
    return new Promise<void>((resolve) => {
      let p: HTMLElement | null = el.parentElement
      while (p) {
        const oy = getComputedStyle(p).overflowY
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 4) break
        p = p.parentElement
      }
      const container: HTMLElement = p ?? (document.scrollingElement as HTMLElement)
      const cRect = container.getBoundingClientRect()
      const eRect = el.getBoundingClientRect()
      let target: number
      if (b === 'start') target = container.scrollTop + (eRect.top - cRect.top) - 12
      else if (b === 'end') target = container.scrollTop + (eRect.bottom - cRect.bottom) + 12
      else target = container.scrollTop + (eRect.top - cRect.top) - (container.clientHeight - eRect.height) / 2
      const max = container.scrollHeight - container.clientHeight
      target = Math.max(0, Math.min(target, max))

      const start = container.scrollTop
      const distance = target - start
      if (Math.abs(distance) < 2) {
        resolve()
        return
      }
      const duration = 1300
      const t0 = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - t0) / duration)
        const eased = 0.5 - Math.cos(progress * Math.PI) / 2 // easeInOut
        container.scrollTop = start + distance * eased
        if (progress < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
  }, block)
  await page.waitForTimeout(500)
}

/** Upiše pojam slovo-po-slovo (kao korisnik) i odabere rezultat iz padajuće liste. */
async function pickLocation(page: Page, input: Locator, query: string, optionLabel: string) {
  await input.click()
  await input.pressSequentially(query, { delay: TYPE_DELAY })
  const option = page.getByRole('listbox').getByText(optionLabel, { exact: true }).first()
  await expect(option).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(BEAT)
  await option.click()
  await page.waitForTimeout(BEAT)
}

test.describe('Simulacija (mobilni) — od početnog ekrana do traženja vozača (E2E)', () => {
  test('TC_SIM_001 — putnik se prijavi, naruči vožnju i sistem traži vozača', async ({ page }) => {
    // Tempo je usporen (slowMo + pauze), pa dižemo limit iznad podrazumijevanih 30s.
    test.setTimeout(120_000)
    await disableOnboarding(page)

    // 0) Tihi preduvjeti: prvo učitavanje kreira mock bazu; uklonimo postojeću aktivnu vožnju
    //    iz seed-a JOŠ PRIJE prijave da kasnije nema potrebe za ponovnim učitavanjem usred toka.
    await page.goto('/welcome')
    await page.waitForFunction((k) => !!localStorage.getItem(k), MOCK_DB_KEY, { timeout: 15_000 })
    await clearActiveRideForDemoPassenger(page)

    // 1) POČETNI EKRAN — ovo je stvarni početak snimljene simulacije (učitava očišćenu bazu).
    await page.goto('/welcome')
    await expect(page.getByRole('button', { name: 'Započni vožnju' })).toBeVisible()
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_001_a_Pocetni_ekran.png', fullPage: true })

    // 2) Korisnik kreće na prijavu.
    await page.getByRole('button', { name: 'Započni vožnju' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_001_b_Prijava.png', fullPage: true })

    // 3) Prijava demo putnika (podaci su unaprijed popunjeni).
    await page.getByRole('button', { name: 'Započni vožnju' }).click()
    await expect(page).toHaveURL(/\/app\/order/)
    await page.waitForTimeout(BEAT)

    // 4) Unos polazišta i odredišta (mobilna ploča — dva polja "Unesite adresu").
    const addressInputs = page.getByPlaceholder('Unesite adresu')
    await pickLocation(page, addressInputs.first(), PICKUP_QUERY, PICKUP_QUERY)
    await pickLocation(page, addressInputs.nth(1), DESTINATION_QUERY, DESTINATION_QUERY)

    // 5) Čekamo da se ruta izračuna (potvrda postaje aktivna, a procjena prikazuje cijenu).
    const confirm = page.getByRole('button', { name: 'Potvrdi vožnju' })
    await expect(confirm).toBeEnabled({ timeout: 15_000 })
    // Pusti da se karta auto-fokusira i ploča prelayoutuje prije skrolanja (da ne "trza").
    await page.waitForTimeout(BEAT)

    // 5a) Korisnik provjerava unos — skrol na vrh da se vide oba unesena odredišta.
    await smoothReveal(page, addressInputs.first(), 'start')
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_001_c_Lokacije_unesene.png', fullPage: true })

    // 5b) Skrol na procjenu — cijena, udaljenost i trajanje vožnje.
    await smoothReveal(page, page.getByText('Procjena', { exact: true }).first(), 'center')
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_001_d_Procjena_cijene.png', fullPage: true })

    // 5c) Tek nakon pregleda korisnik potvrđuje vožnju.
    await smoothReveal(page, confirm, 'center')
    await page.waitForTimeout(BEAT)
    await confirm.click()

    // 6) Sistem počinje tražiti vozača (ekran "traženje vozača").
    await expect(page).toHaveURL(/\/app\/searching/)
    await expect(
      page
        .getByText('Tražimo najbližeg dostupnog vozača…')
        .or(page.getByText('Vozač je pronađen').first())
    ).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(BEAT)
    await page.screenshot({ path: 'UAT/dokazi/TC_SIM_001_e_Trazenje_vozaca.png', fullPage: true })
  })
})
