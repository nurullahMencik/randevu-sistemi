import { describe, expect, it } from 'vitest'
import { hourMarks, positionBlock, shiftOn, startOfWeek, weekDates } from './calendar'
import type { Appointment, CalendarStaff } from './types'

const appointment = (startUtc: string, endUtc: string): Appointment => ({
  id: 'a1',
  startUtc,
  endUtc,
  status: 'Confirmed',
  price: 650,
  notes: null,
  service: { id: 's', name: 'Saç Kesimi', durationMinutes: 45 },
  staff: { id: 'st', fullName: 'Emre Yıldız', color: '#1baf7a' },
  customer: null,
  canCancel: true,
  cancellationDeadlineUtc: startUtc,
  createdAtUtc: startUtc,
})

describe('week helpers', () => {
  it('finds Monday of the week', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02') // Sunday -> Monday before
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02')
  })

  it('lists open days only', () => {
    const days = weekDates('2026-11-02', ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    expect(days).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
  })
})

describe('positionBlock', () => {
  it('positions an appointment as a share of the visible day', () => {
    // 10:00-10:45 Istanbul inside a 09:00-20:00 grid (660 minutes).
    const block = positionBlock(appointment('2026-11-10T07:00:00Z', '2026-11-10T07:45:00Z'), 540, 1200)

    expect(block.date).toBe('2026-11-10')
    expect(block.startMin).toBe(600)
    expect(block.top).toBeCloseTo((60 / 660) * 100)
    expect(block.height).toBeCloseTo((45 / 660) * 100)
  })

  it('clips blocks that start before the grid', () => {
    const block = positionBlock(appointment('2026-11-10T05:30:00Z', '2026-11-10T06:30:00Z'), 540, 1200)
    expect(block.top).toBe(0)
    expect(block.height).toBeCloseTo((30 / 660) * 100)
  })
})

describe('shiftOn', () => {
  const staff: CalendarStaff = {
    id: 'z',
    fullName: 'Zeynep Aydın',
    title: '',
    color: '#eda100',
    workingHours: [{ dayOfWeek: 'Tuesday', start: '11:00:00', end: '20:00:00', breakStart: '15:00:00', breakEnd: '15:30:00' }],
    timeOff: [{ date: '2026-11-17', reason: 'İzin' }],
  }

  it('returns the shift with its break', () => {
    expect(shiftOn(staff, '2026-11-10')).toEqual({ startMin: 660, endMin: 1200, breakStartMin: 900, breakEndMin: 930 })
  })

  it('returns null on a weekly day off or on leave', () => {
    expect(shiftOn(staff, '2026-11-12')).toBeNull() // Thursday
    expect(shiftOn(staff, '2026-11-17')).toBeNull() // Tuesday on leave
  })

  it('creates hour marks for the axis', () => {
    expect(hourMarks(540, 720)).toEqual([540, 600, 660, 720])
  })
})
