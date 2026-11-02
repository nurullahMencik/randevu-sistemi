import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema, serviceSchema, shiftSchema, staffSchema } from './schemas'

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message

describe('loginSchema', () => {
  it('requires a valid email and a password', () => {
    expect(loginSchema.safeParse({ email: 'musteri@randevu.demo', password: 'Demo123!' }).success).toBe(true)
    expect(firstError(loginSchema.safeParse({ email: 'yanlis', password: 'x' }))).toBe('validation.email')
    expect(firstError(loginSchema.safeParse({ email: '', password: 'x' }))).toBe('validation.required')
  })
})

describe('registerSchema', () => {
  const valid = { fullName: 'Deniz Yılmaz', email: 'deniz@example.com', phone: '', password: 'Guclu2026' }

  it('accepts a strong password and an empty phone', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['kisa1A', 'validation.passwordMin'],
    ['hepsikucuk1', 'validation.passwordUpper'],
    ['HEPSIBUYUK1', 'validation.passwordLower'],
    ['RakamYokBurada', 'validation.passwordDigit'],
  ])('rejects %s', (password, message) => {
    expect(firstError(registerSchema.safeParse({ ...valid, password }))).toBe(message)
  })

  it('validates phone numbers when given', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '+90 532 111 22 33' }).success).toBe(true)
    expect(firstError(registerSchema.safeParse({ ...valid, phone: 'abc' }))).toBe('validation.phone')
  })
})

describe('serviceSchema', () => {
  const valid = { name: 'Keratin Bakımı', description: '', durationMinutes: 90, price: 2400, isActive: true, sortOrder: 7 }

  it('requires a duration on the 15 minute grid', () => {
    expect(serviceSchema.safeParse(valid).success).toBe(true)
    expect(firstError(serviceSchema.safeParse({ ...valid, durationMinutes: 50 }))).toBe('validation.durationStep')
    expect(firstError(serviceSchema.safeParse({ ...valid, durationMinutes: 10 }))).toBe('validation.durationRange')
  })

  it('rejects negative prices', () => {
    expect(firstError(serviceSchema.safeParse({ ...valid, price: -5 }))).toBe('validation.priceRange')
  })
})

describe('shiftSchema', () => {
  const shift = {
    dayOfWeek: 'Tuesday' as const,
    enabled: true,
    start: '09:00',
    end: '18:00',
    hasBreak: true,
    breakStart: '13:00',
    breakEnd: '13:45',
  }

  it('accepts a shift with a break inside it', () => {
    expect(shiftSchema.safeParse(shift).success).toBe(true)
  })

  it('rejects an end before the start, hours outside 09-20 and a break outside the shift', () => {
    expect(firstError(shiftSchema.safeParse({ ...shift, end: '08:30' }))).toBe('validation.endAfterStart')
    expect(firstError(shiftSchema.safeParse({ ...shift, start: '08:00' }))).toBe('validation.businessHours')
    expect(firstError(shiftSchema.safeParse({ ...shift, breakStart: '18:30', breakEnd: '19:00' }))).toBe('validation.breakInside')
  })

  it('ignores disabled days', () => {
    expect(shiftSchema.safeParse({ ...shift, enabled: false, end: '01:00' }).success).toBe(true)
  })

  it('requires at least one service for staff', () => {
    const result = staffSchema.safeParse({
      fullName: 'Ece Tan',
      title: 'Stilist',
      color: '#2a78d6',
      bio: '',
      isActive: true,
      serviceIds: [],
      shifts: [shift],
      timeOff: [],
    })
    expect(firstError(result)).toBe('validation.pickService')
  })
})
