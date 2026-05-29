import { defineConfig, devices } from '@playwright/test'

// Konfiguracija za E2E testove (Playwright).
// Pokretanje:  npm run e2e     ·    izvještaj:  npm run e2e:report
// Generiše lijep HTML izvještaj sa screenshotovima i trace-om u ./playwright-report
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on', // screenshot svakog testa (dokaz u izvještaju)
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Automatski pokrene Vite dev server prije testova.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
