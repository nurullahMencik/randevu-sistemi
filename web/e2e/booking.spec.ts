import { expect, test } from '@playwright/test'
import { API, apiLogin, apiRegister, busyDates, chooseServiceStaffAndDay } from './helpers.ts'

test.describe.configure({ mode: 'serial' })

let booked: { id: string; date: string; time: string } | null = null

test('demo customer books an appointment and sees it in "Randevularım"', async ({ page, request }) => {
  const demo = await apiLogin(request, 'musteri@randevu.demo')
  const date = await chooseServiceStaffAndDay(page, 'Saç Kesimi', 'Emre Yıldız', await busyDates(request, demo.accessToken))

  const slot = page.getByTestId('slot-option').first()
  const time = (await slot.textContent())!.trim()
  await slot.click()
  await expect(page.getByRole('heading', { name: 'Her şey doğru mu?' })).toBeVisible()

  // Not signed in yet: the confirm step offers a one-click demo login and keeps the selection.
  await page.getByTestId('demo-customer-login').click()
  await page.getByLabel(/Notunuz/).fill('E2E: ilk randevu')

  const created = page.waitForResponse((r) => r.url().endsWith('/api/appointments') && r.request().method() === 'POST')
  await page.getByTestId('confirm-booking').click()
  const response = await created
  expect(response.status()).toBe(201)
  const appointment = (await response.json()) as { id: string; staff: { fullName: string } }
  expect(appointment.staff.fullName).toBe('Emre Yıldız')

  await expect(page.getByTestId('booking-success')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible()

  await page.getByRole('link', { name: 'Randevularım' }).last().click()
  await expect(page).toHaveURL(/\/appointments$/)
  const card = page.locator(`[data-testid="my-appointment"][data-id="${appointment.id}"]`)
  await expect(card).toBeVisible()
  await expect(card).toContainText('Saç Kesimi')
  await expect(card).toContainText(time)
  await expect(card).toContainText('Onaylı')

  booked = { id: appointment.id, date, time }
})

test('admin sees the same appointment in the weekly calendar', async ({ page }) => {
  test.skip(!booked, 'depends on the booking test')
  await page.goto('login')
  await page.getByTestId('demo-admin').click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()

  await page.goto(`admin/calendar?view=week&date=${booked!.date}`)
  const block = page.locator(`[data-appointment-id="${booked!.id}"]`)
  await expect(block).toBeVisible()
  await expect(block).toContainText(booked!.time)

  await block.click()
  const dialog = page.getByRole('dialog', { name: 'Randevu ayrıntısı' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Deniz Yılmaz')
  await expect(dialog).toContainText('Emre Yıldız')
  await expect(dialog).toContainText('E2E: ilk randevu')
})

test('the same slot cannot be booked twice', async ({ page, request }) => {
  const customer = await apiRegister(request, 'Ece Tan')
  const rival = await apiRegister(request, 'Kaan Öz')

  // Sign in through the real login form.
  await page.goto('login')
  await page.getByLabel('E-posta').fill(customer.email)
  await page.getByLabel('Parola').fill(customer.password)
  await page.getByRole('button', { name: 'Giriş yap' }).last().click()
  await expect(page).toHaveURL(/\/appointments$/)

  await chooseServiceStaffAndDay(page, 'Sakal Tıraşı', 'Can Demir')
  const slot = page.getByTestId('slot-option').first()
  const startUtc = (await slot.getAttribute('data-start'))!
  await slot.click()
  await expect(page.getByTestId('confirm-booking')).toBeVisible()

  // Someone else grabs the very same slot while we are on the confirm step.
  const services = (await (await request.get(`${API}/api/services`)).json()) as { id: string; name: string }[]
  const staff = (await (await request.get(`${API}/api/staff`)).json()) as { id: string; fullName: string }[]
  const rivalBooking = await request.post(`${API}/api/appointments`, {
    headers: { Authorization: `Bearer ${rival.accessToken}` },
    data: {
      serviceId: services.find((s) => s.name === 'Sakal Tıraşı')!.id,
      staffId: staff.find((s) => s.fullName === 'Can Demir')!.id,
      startUtc,
      notes: null,
    },
  })
  expect(rivalBooking.status()).toBe(201)

  const attempt = page.waitForResponse((r) => r.url().endsWith('/api/appointments') && r.request().method() === 'POST')
  await page.getByTestId('confirm-booking').click()
  expect((await attempt).status()).toBe(409)

  // The UI explains what happened, returns to the time step and no longer offers that slot.
  await expect(page.getByText('Bu saat az önce doldu')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Saat kaç olsun?' })).toBeVisible()
  await expect(page.locator(`[data-testid="slot-option"][data-start="${startUtc}"]`)).toHaveCount(0)
})

test('shows the wake-up screen while the API is asleep, then recovers', async ({ page }) => {
  let release: () => void = () => undefined
  const awake = new Promise<void>((resolve) => (release = resolve))
  let calls = 0
  await page.route('**/health', async (route) => {
    calls++
    if (calls < 2) {
      await route.abort('connectionrefused')
      return
    }
    await awake
    await route.continue()
  })

  await page.goto('./')
  const overlay = page.getByRole('dialog', { name: 'Sunucu uyanıyor…' })
  await expect(overlay).toBeVisible()
  await expect(overlay.getByRole('progressbar')).toBeVisible()
  await expect(overlay).toContainText('30–60 saniye')

  release()
  await expect(overlay).toBeHidden({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Hangi hizmeti istersiniz?' })).toBeVisible()
})
