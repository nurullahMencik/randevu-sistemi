import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TimeGrid, type GridColumn } from '../../components/TimeGrid'
import { Avatar, ColorDot } from '../../components/ui/Avatar'
import { Button, IconButton } from '../../components/ui/Button'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { Segmented } from '../../components/ui/Segmented'
import { groupBlocks, shiftOn, startOfWeek, weekDates } from '../../lib/calendar'
import { cn } from '../../lib/cn'
import { addDaysToDateOnly, formatDate, parseDateOnly, timeToMinutes, zonedParts } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { useBusiness, useCalendar } from '../../lib/queries'
import { useNow } from '../../lib/useNow'
import { dayOfWeek } from '../../lib/slots'
import type { Appointment } from '../../lib/types'
import { PageHeader } from './AdminLayout'
import { AppointmentDetailDialog } from './AppointmentDetailDialog'

type View = 'week' | 'day'

export function CalendarPage() {
  const { t, te, lang } = useI18n()
  const [params, setParams] = useSearchParams()
  const now = zonedParts(new Date(useNow()).toISOString())
  const today = now.date
  const view: View = params.get('view') === 'day' || (!params.get('view') && typeof window !== 'undefined' && window.innerWidth < 768) ? 'day' : 'week'
  const business = useBusiness()
  const openDays = business.data?.openDays
  // On a closed day (Monday) start from the next day the salon is open.
  const fallback = openDays ? (Array.from({ length: 7 }, (_, i) => addDaysToDateOnly(today, i)).find((d) => openDays.includes(dayOfWeek(d))) ?? today) : today
  const date = params.get('date') ?? fallback
  const weekStart = startOfWeek(date)
  const weekEnd = addDaysToDateOnly(weekStart, 6)
  const query = useCalendar(weekStart, weekEnd)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Appointment | null>(null)

  const setState = useCallback(
    (next: { view?: View; date?: string }) =>
      setParams(
        (current) => {
          const p = new URLSearchParams(current)
          if (next.view) p.set('view', next.view)
          if (next.date) p.set('date', next.date)
          return p
        },
        { replace: true },
      ),
    [setParams],
  )

  const data = query.data
  const dayStartMin = data ? timeToMinutes(data.openingTime) : 540
  const dayEndMin = data ? timeToMinutes(data.closingTime) : 1200
  const visibleStaff = useMemo(() => (data?.staff ?? []).filter((s) => !hidden.has(s.id)), [data, hidden])
  const blocksByDate = useMemo(() => groupBlocks(data?.appointments ?? [], dayStartMin, dayEndMin), [data, dayStartMin, dayEndMin])

  const columns: GridColumn[] = useMemo(() => {
    if (!data) return []
    if (view === 'week') {
      return weekDates(weekStart, data.openDays).map((d) => {
        const blocks = blocksByDate.get(d) ?? []
        return {
          key: d,
          highlight: d === today,
          nowMin: d === today ? now.minutes : null,
          header: (
            <button type="button" onClick={() => setState({ view: 'day', date: d })} className="w-full rounded-lg py-0.5 hover:bg-surface-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t(`daysShort.${dayOfWeek(d)}`)}</span>
              <span className={cn('mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-base font-semibold tabular', d === today && 'bg-ink text-bg')}>
                {parseDateOnly(d).getDate()}
              </span>
              <span className="block text-[11px] text-muted">{t('admin.calendar.appointmentCount', { n: blocks.length })}</span>
            </button>
          ),
          lanes: visibleStaff.map((s) => ({
            key: s.id,
            color: s.color,
            label: s.fullName,
            shift: shiftOn(s, d),
            blocks: blocks.filter((b) => b.appointment.staff.id === s.id),
          })),
        }
      })
    }
    const blocks = blocksByDate.get(date) ?? []
    const closed = !data.openDays.includes(dayOfWeek(date))
    return visibleStaff.map((s) => ({
      key: s.id,
      highlight: false,
      nowMin: date === today ? now.minutes : null,
      header: (
        <span className="flex items-center justify-center gap-2">
          <Avatar name={s.fullName} color={s.color} size="sm" />
          <span className="text-left">
            <span className="block text-sm font-semibold">{s.fullName}</span>
            <span className="block text-[11px] text-muted">{t('admin.calendar.appointmentCount', { n: blocks.filter((b) => b.appointment.staff.id === s.id).length })}</span>
          </span>
        </span>
      ),
      lanes: [
        {
          key: s.id,
          color: s.color,
          label: s.fullName,
          shift: closed ? null : shiftOn(s, date),
          blocks: blocks.filter((b) => b.appointment.staff.id === s.id),
          offLabel: closed ? t('booking.day.closed') : undefined,
        },
      ],
    }))
  }, [data, view, weekStart, date, blocksByDate, visibleStaff, today, now.minutes, t, setState])

  const step = view === 'week' ? 7 : 1
  const rangeLabel =
    view === 'week'
      ? `${formatDate(weekStart, lang, 'dayMonth')} – ${formatDate(weekEnd, lang, 'dayMonth')} ${parseDateOnly(weekEnd).getFullYear()}`
      : formatDate(date, lang, 'long')

  const toggleStaff = (id: string) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else if (next.size < (data?.staff.length ?? 0) - 1) next.add(id)
      return next
    })

  return (
    <div>
      <PageHeader title={t('admin.calendar.title')} subtitle={<span className="first-letter:uppercase">{rangeLabel}</span>} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label={t('admin.calendar.title')}
            value={view}
            onChange={(v) => setState({ view: v })}
            options={[
              { value: 'week', label: t('admin.calendar.week') },
              { value: 'day', label: t('admin.calendar.day') },
            ]}
          />
          <div className="flex items-center gap-1">
            <IconButton label={view === 'week' ? t('admin.calendar.previousWeek') : t('admin.calendar.previousDay')} onClick={() => setState({ date: addDaysToDateOnly(date, -step) })}>
              <ChevronLeft className="size-5" aria-hidden />
            </IconButton>
            <Button variant="outline" size="sm" onClick={() => setState({ date: fallback })}>
              {view === 'week' ? t('admin.calendar.thisWeek') : t('common.today')}
            </Button>
            <IconButton label={view === 'week' ? t('admin.calendar.nextWeek') : t('admin.calendar.nextDay')} onClick={() => setState({ date: addDaysToDateOnly(date, step) })}>
              <ChevronRight className="size-5" aria-hidden />
            </IconButton>
          </div>
        </div>
        {data ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={t('admin.calendar.staffFilter')}>
            {data.staff.map((s) => {
              const on = !hidden.has(s.id)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleStaff(s.id)}
                    className={cn(
                      'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
                      on ? 'border-border-strong bg-surface text-ink' : 'border-dashed border-border text-muted line-through',
                    )}
                  >
                    <ColorDot color={s.color} className={on ? '' : 'opacity-40'} />
                    {s.fullName}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {query.isError ? <Alert tone="error">{te(query.error)}</Alert> : null}
      {data ? (
        <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')} data-testid="calendar-grid">
          <TimeGrid
            columns={columns}
            dayStartMin={dayStartMin}
            dayEndMin={dayEndMin}
            detail={view === 'week' && visibleStaff.length > 1 ? 'compact' : 'full'}
            minColumnWidth={view === 'week' ? 140 : 180}
            onSelect={setSelected}
            label={rangeLabel}
          />
        </div>
      ) : (
        <Skeleton className="h-[680px]" />
      )}

      <AppointmentDetailDialog appointment={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

