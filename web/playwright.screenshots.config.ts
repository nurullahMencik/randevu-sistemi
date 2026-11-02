import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

/** Captures the README screenshots from the production build (`npm run screenshots`). */
export default defineConfig({
  ...base,
  testDir: './scripts',
  testMatch: 'screenshots.spec.ts',
  retries: 1,
  timeout: 90_000,
  reporter: 'list',
})
