import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screenshots')
const API = 'http://localhost:5305'
mkdirSync(OUT, { recursive: true })

test.use({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light' })

/** No focus ring, caret or hover state may leak into a screenshot. */
async function settle(page: Page) {
  await page.mouse.move(1, 999)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
}

async function signIn(page: Page, role: 'admin' | 'customer') {
  await page.goto('login')
  await page.getByTestId(`demo-${role}`).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

interface Day {
  date: string
  isOpen: boolean
  availableSlots: number
}

async function upcomingDays(page: Page, service: string, staff?: string): Promise<Day[]> {
  const staffParam = staff ? `&staffId=${await staffId(page, staff)}` : ''
  const response = await page.request.get(`${API}/api/availability/days?serviceId=${await serviceId(page, service)}${staffParam}&from=${await today(page)}&days=14`)
  return ((await response.json()) as Day[]).filter((d) => d.isOpen && d.availableSlots > 0)
}

/** The n-th upcoming day on which the service still has free times. */
async function nextOpenDay(page: Page, offset: number, service = 'Saç Kesimi', staff?: string): Promise<string> {
  return (await upcomingDays(page, service, staff))[offset]!.date
}

/** The day in the coming week with the most free times, which makes for a representative picture. */
async function busiestFreeDay(page: Page, service: string, staff?: string): Promise<string> {
  const days = (await upcomingDays(page, service, staff)).slice(0, 7)
  return days.toSorted((a, b) => b.availableSlots - a.availableSlots)[0]!.date
}

async function today(page: Page): Promise<string> {
  return ((await (await page.request.get(`${API}/api/business`)).json()) as { today: string }).today
}

async function serviceId(page: Page, name: string): Promise<string> {
  const services = (await (await page.request.get(`${API}/api/services`)).json()) as { id: string; name: string }[]
  return services.find((s) => s.name === name)!.id
}

async function staffId(page: Page, name: string): Promise<string> {
  const staff = (await (await page.request.get(`${API}/api/staff`)).json()) as { id: string; fullName: string }[]
  return staff.find((s) => s.fullName === name)!.id
}

test('01 hero — admin dashboard', async ({ page }) => {
  await signIn(page, 'admin')
  await page.goto('admin')
  await expect(page.getByTestId('kpi-tile').first()).toBeVisible()
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()
  await settle(page)
  await page.screenshot({ path: join(OUT, '01-hero.png') })
})

test('02 weekly calendar', async ({ page }) => {
  await signIn(page, 'admin')
  await page.goto(`admin/calendar?view=week&date=${await nextOpenDay(page, 0)}`)
  await expect(page.locator('[data-appointment-id]').first()).toBeVisible()
  await settle(page)
  await page.screenshot({ path: join(OUT, '02-calendar.png') })
})

test('03 customer picks a time', async ({ page }) => {
  const date = await busiestFreeDay(page, 'Saç Kesimi', 'Zeynep Aydın')
  await page.goto(`./?service=${await serviceId(page, 'Saç Kesimi')}&staff=${await staffId(page, 'Zeynep Aydın')}&date=${date}`)
  await expect(page.getByTestId('slot-option').first()).toBeVisible()
  await settle(page)
  await page.screenshot({ path: join(OUT, '03-booking-time.png') })
})

test('04 API reference (Scalar)', async ({ page }) => {
  await page.goto(`${API}/scalar`)
  await expect(page.getByText('Randevu API').first()).toBeVisible({ timeout: 30_000 })
  // Open the booking endpoint: it documents the 409 conflict contract.
  await page.getByText('Randevular', { exact: true }).first().click()
  await page.getByText('Randevu oluşturur', { exact: true }).first().click()
  await expect(page).toHaveURL(/POST\/api\/appointments/)
  await page.waitForTimeout(1200)
  await settle(page)
  await page.screenshot({ path: join(OUT, '04-api-docs.png') })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark', isMobile: true, hasTouch: true })

  test('05 mobile booking flow (dark)', async ({ page }) => {
    const date = await busiestFreeDay(page, 'Sakal Tıraşı')
    await page.goto(`./?service=${await serviceId(page, 'Sakal Tıraşı')}&staff=any&date=${date}`)
    await expect(page.getByTestId('slot-option').first()).toBeVisible()
    // Scroll so the step indicator sits just below the sticky header.
    await page.evaluate(() => {
      const steps = document.querySelector('nav[aria-label="Randevu adımları"]')
      if (steps) window.scrollTo({ top: steps.getBoundingClientRect().top + window.scrollY - 80, behavior: 'instant' })
    })
    await settle(page)
    await page.screenshot({ path: join(OUT, '05-mobile-booking.png') })
  })
})
