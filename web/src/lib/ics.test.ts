import { describe, expect, it } from 'vitest'
import { buildIcs } from './ics'

describe('buildIcs', () => {
  it('creates a valid single-event calendar in UTC', () => {
    const ics = buildIcs(
      {
        uid: 'abc',
        startUtc: '2026-11-10T06:45:00Z',
        endUtc: '2026-11-10T07:30:00Z',
        title: 'Saç Kesimi; Emre',
        location: 'Moda Cad. No: 48, Kadıköy',
      },
      new Date('2026-11-02T10:00:00Z'),
    )

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261110T064500Z')
    expect(ics).toContain('DTEND:20261110T073000Z')
    expect(ics).toContain('DTSTAMP:20261102T100000Z')
    expect(ics).toContain(String.raw`SUMMARY:Saç Kesimi\; Emre`)
    expect(ics).toContain(String.raw`LOCATION:Moda Cad. No: 48\, Kadıköy`)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })
})
