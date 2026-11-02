import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const API_PORT = 5305
const WEB_PORT = 5304
const isCI = Boolean(process.env.CI)

// Every run starts the API on a brand-new SQLite file, so seeded data is predictable.
const database = join(tmpdir(), `randevu-e2e-${Date.now()}.db`)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}/randevu-sistemi/`,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'api',
      command: 'dotnet run --project ../api/src/Randevu.Api --no-launch-profile',
      url: `http://localhost:${API_PORT}/health`,
      timeout: 180_000,
      reuseExistingServer: !isCI,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: `http://localhost:${API_PORT}`,
        ConnectionStrings__Default: `Data Source=${database}`,
        RateLimiting__AuthPermitLimit: '200',
      },
    },
    {
      name: 'web',
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}/randevu-sistemi/`,
      timeout: 180_000,
      reuseExistingServer: !isCI,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
    },
  ],
})
