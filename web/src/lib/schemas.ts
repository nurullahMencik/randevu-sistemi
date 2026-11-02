import { z } from 'zod'
import type { DayOfWeek } from './types'

// Messages are i18n keys; forms translate them with t().

const email = z.string().trim().min(1, 'validation.required').pipe(z.email('validation.email'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'validation.required'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'validation.nameMin').max(80, 'validation.tooLong'),
  email,
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[0-9 ()-]{10,20}$/.test(v), 'validation.phone'),
  password: z
    .string()
    .min(8, 'validation.passwordMin')
    .regex(/[A-Z]/, 'validation.passwordUpper')
    .regex(/[a-z]/, 'validation.passwordLower')
    .regex(/[0-9]/, 'validation.passwordDigit'),
})
export type RegisterForm = z.infer<typeof registerSchema>

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'validation.required').max(80, 'validation.tooLong'),
  description: z.string().trim().max(300, 'validation.tooLong'),
  durationMinutes: z
    .number('validation.number')
    .int('validation.number')
    .min(15, 'validation.durationRange')
    .max(480, 'validation.durationRange')
    .multipleOf(15, 'validation.durationStep'),
  price: z.number('validation.number').min(0, 'validation.priceRange').max(100_000, 'validation.priceRange'),
  isActive: z.boolean(),
  sortOrder: z.number('validation.number').int('validation.number').min(0).max(1000),
})
export type ServiceForm = z.infer<typeof serviceSchema>

const time = z.string().regex(/^\d{2}:\d{2}$/, 'validation.time')
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export const shiftSchema = z
  .object({
    dayOfWeek: z.custom<DayOfWeek>(),
    enabled: z.boolean(),
    start: time,
    end: time,
    hasBreak: z.boolean(),
    breakStart: time,
    breakEnd: time,
  })
  .superRefine((shift, ctx) => {
    if (!shift.enabled) return
    if (toMin(shift.end) <= toMin(shift.start)) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'validation.endAfterStart' })
    }
    if (toMin(shift.start) < 9 * 60 || toMin(shift.end) > 20 * 60) {
      ctx.addIssue({ code: 'custom', path: ['start'], message: 'validation.businessHours' })
    }
    if (
      shift.hasBreak &&
      (toMin(shift.breakStart) < toMin(shift.start) ||
        toMin(shift.breakEnd) > toMin(shift.end) ||
        toMin(shift.breakEnd) <= toMin(shift.breakStart))
    ) {
      ctx.addIssue({ code: 'custom', path: ['breakStart'], message: 'validation.breakInside' })
    }
  })

export const staffSchema = z.object({
  fullName: z.string().trim().min(3, 'validation.nameMin').max(80, 'validation.tooLong'),
  title: z.string().trim().min(2, 'validation.required').max(80, 'validation.tooLong'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'validation.color'),
  bio: z.string().trim().max(300, 'validation.tooLong'),
  isActive: z.boolean(),
  serviceIds: z.array(z.string()).min(1, 'validation.pickService'),
  shifts: z.array(shiftSchema),
  timeOff: z.array(z.object({ date: z.string().min(10, 'validation.required'), reason: z.string().max(120, 'validation.tooLong') })),
})
export type StaffForm = z.infer<typeof staffSchema>
