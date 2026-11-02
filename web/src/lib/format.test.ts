import { describe, expect, it } from 'vitest'
import {
  addDaysToDateOnly,
  diffDays,
  formatDuration,
  formatPrice,
  initials,
  minutesToTime,
  timeToMinutes,
  zonedParts,
} from './format'

describe('zonedParts', () => {
  it('converts UTC instants to Istanbul wall-clock time (UTC+3, no DST)', () => {
    expect(zonedParts('2026-11-10T06:45:00Z')).toEqual({ date: '2026-11-10', time: '09:45', minutes: 585 })
    expect(zonedParts('2026-07-10T06:45:00Z').time).toBe('09:45')
  })

  it('rolls over to the next local day', () => {
    expect(zonedParts('2026-11-02T22:30:00Z').date).toBe('2026-11-03')
  })
})

describe('calendar date helpers', () => {
  it('adds days across month boundaries', () => {
    expect(addDaysToDateOnly('2026-10-30', 3)).toBe('2026-11-02')
    expect(diffDays('2026-11-02', '2026-10-30')).toBe(3)
  })

  it('converts between HH:mm and minutes', () => {
    expect(timeToMinutes('09:15:00')).toBe(555)
    expect(minutesToTime(555)).toBe('09:15')
  })
})

describe('formatting', () => {
  it('formats prices in Turkish lira without decimals', () => {
    expect(formatPrice(1850, 'tr')).toBe('₺1.850')
    expect(formatPrice(1850, 'en')).toBe('₺1,850')
  })

  it('formats durations', () => {
    expect(formatDuration(45, 'tr')).toBe('45 dk')
    expect(formatDuration(120, 'tr')).toBe('2 sa')
    expect(formatDuration(90, 'en')).toBe('1 h 30 min')
  })

  it('builds initials with Turkish casing', () => {
    expect(initials('ilker şahin')).toBe('İŞ')
    expect(initials('Zeynep Aydın')).toBe('ZA')
  })
})
