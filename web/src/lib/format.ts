import { addDays, format } from 'date-fns'
import { enUS, tr } from 'date-fns/locale'
import { BUSINESS_TIME_ZONE } from './env'

export type Lang = 'tr' | 'en'

export const dateLocale = (lang: Lang) => (lang === 'tr' ? tr : enUS)
const numberLocale = (lang: Lang) => (lang === 'tr' ? 'tr-TR' : 'en-US')

/** Parses a calendar date ("2026-11-10") as a local Date at noon, which is immune to DST shifts. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12)
}

export function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function addDaysToDateOnly(value: string, days: number): string {
  return toDateOnly(addDays(parseDateOnly(value), days))
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDateOnly(a).getTime() - parseDateOnly(b).getTime()) / 86_400_000)
}

const partsFormatter = new Map<string, Intl.DateTimeFormat>()

/**
 * Wall-clock date and time of a UTC instant in the business time zone, independent of the
 * visitor's own zone (a visitor in Berlin still sees Istanbul times).
 */
export function zonedParts(isoUtc: string, timeZone = BUSINESS_TIME_ZONE): { date: string; time: string; minutes: number } {
  let formatter = partsFormatter.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    partsFormatter.set(timeZone, formatter)
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(isoUtc)).map((p) => [p.type, p.value]))
  const hour = Number(parts.hour) % 24
  const minute = Number(parts.minute)
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    minutes: hour * 60 + minute,
  }
}

export const formatTime = (isoUtc: string) => zonedParts(isoUtc).time

/** "09:00:00" -> 540 */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** 540 -> "09:00" */
export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "09:00:00" -> "09:00" */
export const shortTime = (value: string) => value.slice(0, 5)

export function formatDate(value: string, lang: Lang, pattern: 'long' | 'medium' | 'short' | 'weekday' | 'dayMonth' = 'long'): string {
  const patterns = {
    long: lang === 'tr' ? 'd MMMM yyyy, EEEE' : 'EEEE, MMMM d, yyyy',
    medium: lang === 'tr' ? 'd MMMM EEEE' : 'EEEE, MMMM d',
    short: lang === 'tr' ? 'd MMM' : 'MMM d',
    weekday: 'EEE',
    dayMonth: lang === 'tr' ? 'd MMMM' : 'MMMM d',
  } as const
  return format(parseDateOnly(value), patterns[pattern], { locale: dateLocale(lang) })
}

export function formatPrice(value: number, lang: Lang): string {
  return new Intl.NumberFormat(numberLocale(lang), {
    style: 'currency',
    currency: 'TRY',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

export function formatPercent(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(numberLocale(lang), {
    style: 'percent',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value / 100)
}

export function formatDuration(minutes: number, lang: Lang): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hu = lang === 'tr' ? 'sa' : 'h'
  const mu = lang === 'tr' ? 'dk' : 'min'
  if (h === 0) return `${m} ${mu}`
  if (m === 0) return `${h} ${hu}`
  return `${h} ${hu} ${m} ${mu}`
}

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('')
}
