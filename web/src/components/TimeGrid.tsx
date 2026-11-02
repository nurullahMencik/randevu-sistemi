import type { CSSProperties, ReactNode } from 'react'
import { hourMarks, type PositionedBlock, type ShiftSpan } from '../lib/calendar'
import { cn } from '../lib/cn'
import { formatTime, minutesToTime } from '../lib/format'
import { useI18n } from '../lib/i18n/context'
import { useSeriesColor } from '../lib/theme'
import type { Appointment } from '../lib/types'

export interface GridLane {
  key: string
  color: string
  label: string
  shift: ShiftSpan | null
  blocks: PositionedBlock[]
  /** Text shown in a lane without a shift (defaults to "off"). */
  offLabel?: string
}

export interface GridColumn {
  key: string
  header: ReactNode
  highlight?: boolean
  lanes: GridLane[]
  /** Minutes since midnight for a "now" marker, when this column is today. */
  nowMin?: number | null
}

interface TimeGridProps {
  columns: GridColumn[]
  dayStartMin: number
  dayEndMin: number
  hourHeight?: number
  minColumnWidth?: number
  detail: 'compact' | 'full'
  onSelect: (appointment: Appointment) => void
  label: string
}

const pct = (value: number) => `${value}%`

/**
 * Calendar time grid. Columns are days (week view) or people (day view); each column is split
 * into lanes, one per staff member, so colours stay in the same position across days.
 */
export function TimeGrid({ columns, dayStartMin, dayEndMin, hourHeight = 56, minColumnWidth = 150, detail, onSelect, label }: TimeGridProps) {
  const { t } = useI18n()
  const series = useSeriesColor()
  const span = dayEndMin - dayStartMin
  const height = (span / 60) * hourHeight
  const marks = hourMarks(dayStartMin, dayEndMin)
  const toPct = (minute: number) => ((minute - dayStartMin) / span) * 100

  return (
    <div className="card overflow-hidden">
      <section className="scrollbar-thin overflow-x-auto" aria-label={label}>
        <div className="grid" style={{ gridTemplateColumns: `3.25rem repeat(${columns.length}, minmax(${minColumnWidth}px, 1fr))` }}>
          {/* Header row */}
          <div className="sticky left-0 z-20 border-b border-border bg-surface" />
          {columns.map((column) => (
            <div key={column.key} className={cn('border-b border-l border-border px-2 py-2.5 text-center', column.highlight && 'bg-brand-soft/40')}>
              {column.header}
            </div>
          ))}

          {/* Time axis */}
          <div className="sticky left-0 z-20 border-r border-border bg-surface" style={{ height }}>
            <div className="relative h-full">
              {marks.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted tabular" style={{ top: pct(toPct(m)) }}>
                  {m === dayStartMin || m === dayEndMin ? '' : minutesToTime(m)}
                </span>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.key} className="relative border-l border-border" style={{ height }}>
              {/* Hour lines */}
              {marks.map((m) => (
                <div key={m} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-[var(--chart-grid)]" style={{ top: pct(toPct(m)) }} />
              ))}
              <div className="absolute inset-0 flex">
                {column.lanes.map((lane) => (
                  <div key={lane.key} className="relative h-full min-w-0 flex-1 border-l border-dashed border-border/60 first:border-l-0">
                    {/* Off-shift time is tinted so the working window stands out. */}
                    <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_6px,transparent_6px_12px)] opacity-70" />
                    {lane.shift ? (
                      <div
                        aria-hidden
                        className="absolute inset-x-0 bg-surface"
                        style={{ top: pct(toPct(lane.shift.startMin)), height: pct(((lane.shift.endMin - lane.shift.startMin) / span) * 100) }}
                      />
                    ) : null}
                    {typeof lane.shift?.breakStartMin === 'number' && typeof lane.shift.breakEndMin === 'number' ? (
                      <div
                        className="absolute inset-x-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--surface-3)_0_4px,transparent_4px_8px)]"
                        style={{
                          top: pct(toPct(lane.shift.breakStartMin)),
                          height: pct(((lane.shift.breakEndMin - lane.shift.breakStartMin) / span) * 100),
                        }}
                        title={t('admin.calendar.break')}
                      >
                        {detail === 'full' ? <span className="rounded bg-surface px-1 text-[10px] text-muted">{t('admin.calendar.break')}</span> : null}
                      </div>
                    ) : null}
                    {lane.shift === null && detail === 'full' ? (
                      <div className="absolute inset-x-0 top-3 text-center text-xs font-medium text-muted">{lane.offLabel ?? t('admin.calendar.off')}</div>
                    ) : null}
                    {lane.blocks.map((block) => (
                      <AppointmentBlock key={block.appointment.id} block={block} color={series(lane.color)} detail={detail} hourHeight={hourHeight} onSelect={onSelect} />
                    ))}
                  </div>
                ))}
              </div>
              {typeof column.nowMin === 'number' && column.nowMin >= dayStartMin && column.nowMin <= dayEndMin ? (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-danger" style={{ top: pct(toPct(column.nowMin)) }}>
                  <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-danger" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AppointmentBlock({ block, color, detail, hourHeight, onSelect }: {
  block: PositionedBlock
  color: string
  detail: 'compact' | 'full'
  hourHeight: number
  onSelect: (appointment: Appointment) => void
}) {
  const { appointment } = block
  // Only render as many text lines as fit, so nothing is clipped mid-glyph.
  const px = ((block.endMin - block.startMin) / 60) * hourHeight
  const lines = detail === 'compact' ? 1 : px >= 47 ? 3 : px >= 34 ? 2 : 1
  const style: CSSProperties = {
    top: pct(block.top),
    height: pct(block.height),
    background: `color-mix(in oklab, ${color} 18%, var(--surface))`,
    borderLeftColor: color,
  }
  const start = formatTime(appointment.startUtc)
  const end = formatTime(appointment.endUtc)
  const customer = appointment.customer?.fullName ?? ''
  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      style={style}
      data-appointment-id={appointment.id}
      aria-label={`${start}–${end}, ${appointment.service.name}, ${customer}, ${appointment.staff.fullName}`}
      className={cn(
        'absolute inset-x-0.5 z-[1] overflow-hidden rounded-md border-l-[3px] py-1 text-left text-ink shadow-[0_0_0_1px_var(--surface)] transition-[filter] hover:brightness-95 focus-visible:z-10',
        detail === 'compact' ? 'px-1' : 'px-1.5',
        appointment.status === 'Completed' && 'opacity-80',
        appointment.status === 'NoShow' && 'opacity-60',
      )}
    >
      <span className="block truncate text-[11px] font-semibold leading-tight tabular">{detail === 'full' ? `${start}–${end}` : start}</span>
      {lines >= 2 ? <span className="block truncate text-[11px] leading-tight text-ink-2">{appointment.service.name}</span> : null}
      {lines >= 3 ? <span className="block truncate text-[11px] leading-tight text-muted">{customer}</span> : null}
    </button>
  )
}
