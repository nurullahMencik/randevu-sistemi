import { addDaysToDateOnly, parseDateOnly } from './format'
import type { DayAvailability, DayOfWeek, Slot } from './types'

export type DayPeriod = 'morning' | 'afternoon' | 'evening'

const DAY_NAMES: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function dayOfWeek(date: string): DayOfWeek {
  return DAY_NAMES[parseDateOnly(date).getDay()] as DayOfWeek
}

/** Morning before 12:00, afternoon before 17:00, evening after. */
export function periodOf(localTime: string): DayPeriod {
  const hour = Number(localTime.slice(0, 2))
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export function groupSlotsByPeriod(slots: readonly Slot[]): { period: DayPeriod; slots: Slot[] }[] {
  const order: DayPeriod[] = ['morning', 'afternoon', 'evening']
  const groups = new Map<DayPeriod, Slot[]>()
  for (const slot of slots.toSorted((a, b) => a.startUtc.localeCompare(b.startUtc))) {
    const period = periodOf(slot.localTime)
    groups.set(period, [...(groups.get(period) ?? []), slot])
  }
  return order.filter((p) => groups.has(p)).map((period) => ({ period, slots: groups.get(period) ?? [] }))
}

export interface DayCell {
  date: string
  inRange: boolean
  isOpen: boolean
  available: number
  isToday: boolean
}

/**
 * Lays out a booking window as Monday-first calendar weeks. Days before the window (or after it)
 * are present but `inRange: false`, so the grid always has whole weeks.
 */
export function buildDayGrid(today: string, days: number, availability: readonly DayAvailability[]): DayCell[][] {
  const byDate = new Map(availability.map((d) => [d.date, d]))
  const last = addDaysToDateOnly(today, days - 1)
  const mondayOffset = (parseDateOnly(today).getDay() + 6) % 7
  const start = addDaysToDateOnly(today, -mondayOffset)

  const weeks: DayCell[][] = []
  let cursor = start
  while (cursor <= last) {
    const week: DayCell[] = []
    for (let i = 0; i < 7; i++) {
      const info = byDate.get(cursor)
      const inRange = cursor >= today && cursor <= last
      week.push({
        date: cursor,
        inRange,
        isOpen: inRange && (info?.isOpen ?? false),
        available: inRange ? (info?.availableSlots ?? 0) : 0,
        isToday: cursor === today,
      })
      cursor = addDaysToDateOnly(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** First day in the window that still has a free slot. */
export function firstAvailableDay(availability: readonly DayAvailability[]): string | null {
  return availability.find((d) => d.isOpen && d.availableSlots > 0)?.date ?? null
}
