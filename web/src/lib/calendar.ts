import { addDaysToDateOnly, parseDateOnly, timeToMinutes, zonedParts } from './format'
import { dayOfWeek } from './slots'
import type { Appointment, CalendarStaff, DayOfWeek } from './types'

/** Monday of the week that contains `date`. */
export function startOfWeek(date: string): string {
  const offset = (parseDateOnly(date).getDay() + 6) % 7
  return addDaysToDateOnly(date, -offset)
}

export function weekDates(weekStart: string, openDays?: readonly DayOfWeek[]): string[] {
  const all = Array.from({ length: 7 }, (_, i) => addDaysToDateOnly(weekStart, i))
  return openDays ? all.filter((d) => openDays.includes(dayOfWeek(d))) : all
}

export interface PositionedBlock {
  appointment: Appointment
  date: string
  startMin: number
  endMin: number
  top: number
  height: number
}

/** Vertical position (percent of the visible day) of an appointment in a time grid. */
export function positionBlock(
  appointment: Appointment,
  dayStartMin: number,
  dayEndMin: number,
): PositionedBlock {
  const start = zonedParts(appointment.startUtc)
  const end = zonedParts(appointment.endUtc)
  const span = dayEndMin - dayStartMin
  const startMin = Math.max(start.minutes, dayStartMin)
  const endMin = Math.min(end.date === start.date ? end.minutes : 24 * 60, dayEndMin)
  return {
    appointment,
    date: start.date,
    startMin,
    endMin,
    top: ((startMin - dayStartMin) / span) * 100,
    height: (Math.max(endMin - startMin, 0) / span) * 100,
  }
}

/** Groups positioned blocks by local date, then by staff id. */
export function groupBlocks(
  appointments: readonly Appointment[],
  dayStartMin: number,
  dayEndMin: number,
): Map<string, PositionedBlock[]> {
  const map = new Map<string, PositionedBlock[]>()
  for (const appointment of appointments) {
    const block = positionBlock(appointment, dayStartMin, dayEndMin)
    map.set(block.date, [...(map.get(block.date) ?? []), block])
  }
  return map
}

export interface ShiftSpan {
  startMin: number
  endMin: number
  breakStartMin: number | null
  breakEndMin: number | null
}

/** A staff member's shift on a date, or null on a day off / leave. */
export function shiftOn(staff: CalendarStaff, date: string): ShiftSpan | null {
  if (staff.timeOff.some((t) => t.date === date)) return null
  const hours = staff.workingHours.find((w) => w.dayOfWeek === dayOfWeek(date))
  if (!hours) return null
  return {
    startMin: timeToMinutes(hours.start),
    endMin: timeToMinutes(hours.end),
    breakStartMin: hours.breakStart ? timeToMinutes(hours.breakStart) : null,
    breakEndMin: hours.breakEnd ? timeToMinutes(hours.breakEnd) : null,
  }
}

/** Hour marks for the time grid's axis, e.g. [540, 600, ...]. */
export function hourMarks(dayStartMin: number, dayEndMin: number): number[] {
  const marks: number[] = []
  for (let m = Math.ceil(dayStartMin / 60) * 60; m <= dayEndMin; m += 60) marks.push(m)
  return marks
}
