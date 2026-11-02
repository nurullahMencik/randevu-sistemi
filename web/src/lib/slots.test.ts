import { describe, expect, it } from 'vitest'
import { buildDayGrid, dayOfWeek, firstAvailableDay, groupSlotsByPeriod, periodOf } from './slots'
import type { DayAvailability, Slot } from './types'

const slot = (localTime: string, hourUtc: number, minute = 0): Slot => ({
  startUtc: `2026-11-10T${String(hourUtc).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
  endUtc: '',
  localTime,
  staffIds: ['a'],
})

describe('periodOf', () => {
  it.each([
    ['09:00', 'morning'],
    ['11:45', 'morning'],
    ['12:00', 'afternoon'],
    ['16:45', 'afternoon'],
    ['17:00', 'evening'],
    ['19:15', 'evening'],
  ] as const)('%s is %s', (time, period) => {
    expect(periodOf(time)).toBe(period)
  })
})

describe('groupSlotsByPeriod', () => {
  it('groups in chronological order and drops empty periods', () => {
    const groups = groupSlotsByPeriod([slot('17:30', 14, 30), slot('09:15', 6, 15), slot('09:00', 6, 0)])

    expect(groups.map((g) => g.period)).toEqual(['morning', 'evening'])
    expect(groups[0]?.slots.map((s) => s.localTime)).toEqual(['09:00', '09:15'])
  })

  it('returns no groups for no slots', () => {
    expect(groupSlotsByPeriod([])).toEqual([])
  })
})

describe('buildDayGrid', () => {
  const availability: DayAvailability[] = [
    { date: '2026-11-02', isOpen: false, availableSlots: 0 }, // Monday, closed
    { date: '2026-11-03', isOpen: true, availableSlots: 12 },
    { date: '2026-11-04', isOpen: true, availableSlots: 0 }, // fully booked
  ]

  it('produces whole Monday-first weeks covering the window', () => {
    const weeks = buildDayGrid('2026-11-04', 14, availability)

    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]?.[0]?.date).toBe('2026-11-02')
    expect(dayOfWeek(weeks[0]![0]!.date)).toBe('Monday')
    // Window is Nov 4 .. Nov 17 -> three calendar weeks.
    expect(weeks).toHaveLength(3)
  })

  it('marks days outside the window and carries availability', () => {
    const weeks = buildDayGrid('2026-11-03', 14, availability)
    const cells = weeks.flat()

    expect(cells.find((c) => c.date === '2026-11-02')?.inRange).toBe(false)
    expect(cells.find((c) => c.date === '2026-11-03')).toMatchObject({ inRange: true, isOpen: true, available: 12, isToday: true })
    expect(cells.find((c) => c.date === '2026-11-04')).toMatchObject({ isOpen: true, available: 0 })
  })

  it('finds the first day with free slots', () => {
    expect(firstAvailableDay(availability)).toBe('2026-11-03')
    expect(firstAvailableDay([])).toBeNull()
  })
})
