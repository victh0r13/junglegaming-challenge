import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4173)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`
const executablePath = process.env.PW_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        launchOptions: { executablePath },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
