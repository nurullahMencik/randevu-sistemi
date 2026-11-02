import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const API = 'http://localhost:5305'

export interface Session {
  accessToken: string
  user: { id: string; fullName: string }
}

export async function apiLogin(request: APIRequestContext, email: string, password = 'Demo123!'): Promise<Session> {
  const response = await request.post(`${API}/api/auth/login`, { data: { email, password } })
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as Session
}

/** Registers a throw-away customer directly against the API. */
export async function apiRegister(request: APIRequestContext, name: string): Promise<Session & { email: string; password: string }> {
  const email = `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.com`
  const password = 'Guclu2026'
  const response = await request.post(`${API}/api/auth/register`, { data: { fullName: name, email, password, phone: null } })
  expect(response.status()).toBe(201)
  return { ...((await response.json()) as Session), email, password }
}

/** Local dates (Istanbul) on which the customer already has an upcoming appointment. */
export async function busyDates(request: APIRequestContext, token: string): Promise<Set<string>> {
  const response = await request.get(`${API}/api/me/appointments`, { headers: { Authorization: `Bearer ${token}` } })
  const body = (await response.json()) as { upcoming: { startUtc: string }[] }
  const local = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3_600_000).toISOString().slice(0, 10)
  return new Set(body.upcoming.map((a) => local(a.startUtc)))
}

/** Walks the booking wizard up to the time step and returns the chosen date. */
export async function chooseServiceStaffAndDay(page: Page, service: string, staff: string, avoid: Set<string> = new Set()): Promise<string> {
  await page.goto('./')
  await page.getByTestId('service-option').filter({ hasText: service }).click()
  await expect(page.getByRole('heading', { name: 'Kiminle?' })).toBeVisible()
  await page.getByTestId('staff-option').filter({ hasText: staff }).click()
  await expect(page.getByRole('heading', { name: 'Hangi gün?' })).toBeVisible()

  const days = page.locator('[data-testid="day-option"]:not([disabled])')
  await expect(days.first()).toBeVisible()
  const dates = await days.evaluateAll((els) => els.map((el) => el.getAttribute('data-date') ?? ''))
  // Prefer a day a few days out so the slot is safely more than 2 hours away.
  const date = dates.filter((d) => !avoid.has(d)).at(2) ?? dates.filter((d) => !avoid.has(d))[0]
  expect(date, 'a free day exists').toBeTruthy()
  await page.locator(`[data-testid="day-option"][data-date="${date}"]`).click()
  await expect(page.getByRole('heading', { name: 'Saat kaç olsun?' })).toBeVisible()
  return date!
}
