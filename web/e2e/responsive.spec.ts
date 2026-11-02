import { expect, test, type Page } from '@playwright/test'
import { API } from './helpers.ts'

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

async function expectNoHorizontalScroll(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0)
}

async function demoLogin(page: Page, role: 'customer' | 'staff' | 'admin') {
  await page.goto('login')
  await page.getByTestId(`demo-${role}`).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

test('no page scrolls horizontally at 375 px', async ({ page, request }) => {
  const services = (await (await request.get(`${API}/api/services`)).json()) as { id: string }[]
  const business = (await (await request.get(`${API}/api/business`)).json()) as { today: string }
  const days = (await (await request.get(`${API}/api/availability/days?serviceId=${services[0]!.id}&from=${business.today}&days=14`)).json()) as {
    date: string
    availableSlots: number
  }[]
  const date = days.find((d) => d.availableSlots > 0)!.date

  for (const path of ['./', `./?service=${services[0]!.id}`, `./?service=${services[0]!.id}&staff=any`, `./?service=${services[0]!.id}&staff=any&date=${date}`, 'login', 'register']) {
    await expectNoHorizontalScroll(page, path)
  }

  await demoLogin(page, 'customer')
  await expectNoHorizontalScroll(page, 'appointments')

  await demoLogin(page, 'staff')
  await expectNoHorizontalScroll(page, 'staff')

  await demoLogin(page, 'admin')
  for (const path of ['admin', 'admin/calendar', 'admin/calendar?view=week', 'admin/appointments', 'admin/services', 'admin/staff']) {
    await expectNoHorizontalScroll(page, path)
  }
})
