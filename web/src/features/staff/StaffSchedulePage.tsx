import { CalendarCheck2, ChevronLeft, ChevronRight, Coffee, Phone, StickyNote } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TimeGrid, type GridColumn } from '../../components/TimeGrid'
import { StatusBadge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { groupBlocks, shiftOn, startOfWeek, weekDates } from '../../lib/calendar'
import { cn } from '../../lib/cn'
import { addDaysToDateOnly, formatDate, formatDuration, formatTime, minutesToTime, parseDateOnly, timeToMinutes, zonedParts } from '../../lib/format'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n/context'
import { useMySchedule } from '../../lib/queries'
import { useNow } from '../../lib/useNow'
import { dayOfWeek } from '../../lib/slots'
import type { Appointment } from '../../lib/types'
import { AppointmentDetailDialog } from '../admin/AppointmentDetailDialog'

export function StaffSchedulePage() {
  const { t, te, lang } = useI18n()
  const { user } = useAuth()
  const now = zonedParts(new Date(useNow()).toISOString())
  const today = now.date
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const weekEnd = addDaysToDateOnly(weekStart, 6)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const query = useMySchedule(weekStart, weekEnd)
  const todayQuery = useMySchedule(startOfWeek(today), addDaysToDateOnly(startOfWeek(today), 6))
  const data = query.data
  const me = data?.staff[0]

  const dayStartMin = data ? timeToMinutes(data.openingTime) : 540
  const dayEndMin = data ? timeToMinutes(data.closingTime) : 1200
  const blocks = useMemo(() => groupBlocks(data?.appointments ?? [], dayStartMin, dayEndMin), [data, dayStartMin, dayEndMin])

  const columns: GridColumn[] = useMemo(() => {
    if (!data || !me) return []
    return weekDates(weekStart, data.openDays).map((d) => ({
      key: d,
      highlight: d === today,
      nowMin: d === today ? now.minutes : null,
      header: (
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t(`daysShort.${dayOfWeek(d)}`)}</span>
          <span className={cn('mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-base font-semibold tabular', d === today && 'bg-ink text-bg')}>
            {parseDateOnly(d).getDate()}
          </span>
        </span>
      ),
      lanes: [{ key: me.id, color: me.color, label: me.fullName, shift: shiftOn(me, d), blocks: blocks.get(d) ?? [] }],
    }))
  }, [data, me, weekStart, today, now.minutes, blocks, t])

  const todayMe = todayQuery.data?.staff[0]
  const todayShift = todayMe ? shiftOn(todayMe, today) : null
  const todayAppointments = (todayQuery.data?.appointments ?? []).filter((a) => zonedParts(a.startUtc).date === today)
  const bookedMinutes = todayAppointments.reduce((sum, a) => sum + a.service.durationMinutes, 0)

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{t('staffView.title')}</h1>
      <p className="mt-2 text-ink-2">
        {user?.fullName} · {t('staffView.lead')}
      </p>

      {query.isError ? <Alert tone="error" className="mt-6">{te(query.error)}</Alert> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-labelledby="today-title" className="flex flex-col gap-3">
          <div className="card p-5">
            <h2 id="today-title" className="font-display text-xl font-semibold">
              {t('staffView.today')}
            </h2>
            <p className="text-sm text-ink-2 first-letter:uppercase">{formatDate(today, lang, 'long')}</p>
            {todayQuery.data ? (
              <div className="mt-4 flex flex-col gap-1.5 text-sm">
                {todayShift ? (
                  <>
                    <p className="inline-flex items-center gap-2">
                      <CalendarCheck2 className="size-4 text-muted" aria-hidden />
                      {t('staffView.shift', { start: minutesToTime(todayShift.startMin), end: minutesToTime(todayShift.endMin) })}
                    </p>
                    {todayShift.breakStartMin !== null && todayShift.breakEndMin !== null ? (
                      <p className="inline-flex items-center gap-2 text-ink-2">
                        <Coffee className="size-4 text-muted" aria-hidden />
                        {t('staffView.breakAt', { start: minutesToTime(todayShift.breakStartMin), end: minutesToTime(todayShift.breakEndMin) })}
                      </p>
                    ) : null}
                    <p className="mt-1 font-medium">{t('staffView.stats', { count: todayAppointments.length, hours: formatDuration(bookedMinutes, lang) })}</p>
                  </>
                ) : (
                  <p className="text-ink-2">{t('staffView.dayOff')}</p>
                )}
              </div>
            ) : (
              <Skeleton className="mt-4 h-16" />
            )}
          </div>
          {todayQuery.data && todayAppointments.length === 0 ? (
            <EmptyState icon={<CalendarCheck2 className="size-5" aria-hidden />} title={t('staffView.todayEmpty')} />
          ) : (
            <ol className="flex flex-col gap-2">
              {todayAppointments.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelected(a)} className="card flex w-full gap-4 p-4 text-left hover:border-border-strong">
                    <span className="w-14 shrink-0 text-center">
                      <span className="block text-lg font-semibold tabular">{formatTime(a.startUtc)}</span>
                      <span className="block text-xs text-muted tabular">{formatTime(a.endUtc)}</span>
                    </span>
                    <span className="min-w-0 flex-1 border-l border-border pl-4">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{a.service.name}</span>
                        <StatusBadge status={a.status} />
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-2">{a.customer?.fullName}</span>
                      {a.customer?.phone ? (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
                          <Phone className="size-3.5" aria-hidden />
                          {a.customer.phone}
                        </span>
                      ) : null}
                      {a.notes ? (
                        <span className="mt-1 flex items-start gap-1.5 text-xs text-muted">
                          <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {a.notes}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="week-title" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="week-title" className="font-display text-xl font-semibold">
              {t('staffView.week')}
              <span className="ml-2 font-sans text-sm font-normal text-muted">
                {formatDate(weekStart, lang, 'dayMonth')} – {formatDate(weekEnd, lang, 'dayMonth')}
              </span>
            </h2>
            <div className="flex items-center gap-1">
              <IconButton label={t('admin.calendar.previousWeek')} onClick={() => setWeekStart(addDaysToDateOnly(weekStart, -7))}>
                <ChevronLeft className="size-5" aria-hidden />
              </IconButton>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(today))}>
                {t('admin.calendar.thisWeek')}
              </Button>
              <IconButton label={t('admin.calendar.nextWeek')} onClick={() => setWeekStart(addDaysToDateOnly(weekStart, 7))}>
                <ChevronRight className="size-5" aria-hidden />
              </IconButton>
            </div>
          </div>
          {data ? (
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <TimeGrid columns={columns} dayStartMin={dayStartMin} dayEndMin={dayEndMin} detail="full" minColumnWidth={110} onSelect={setSelected} label={t('staffView.week')} hourHeight={48} />
            </div>
          ) : (
            <Skeleton className="h-[560px]" />
          )}
        </section>
      </div>

      <AppointmentDetailDialog appointment={selected} onClose={() => setSelected(null)} actions={false} />
    </div>
  )
}
