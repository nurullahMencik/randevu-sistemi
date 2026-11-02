import { CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { formatDate, formatDuration } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { groupSlotsByPeriod } from '../../lib/slots'
import type { DayAvailability, Slot } from '../../lib/types'

export function TimeStep({ date, slots, loading, durationMinutes, days, selected, onSelect, onChangeDate }: {
  date: string
  slots: Slot[] | undefined
  loading: boolean
  durationMinutes: number
  days: DayAvailability[] | undefined
  selected: string | null
  onSelect: (slot: Slot) => void
  onChangeDate: (date: string) => void
}) {
  const { t, lang } = useI18n()
  const bookableDays = (days ?? []).filter((d) => d.isOpen && d.availableSlots > 0).map((d) => d.date)
  const previous = bookableDays.toReversed().find((d) => d < date)
  const next = bookableDays.find((d) => d > date)
  const groups = groupSlotsByPeriod(slots ?? [])

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
        <IconButton label={t('booking.time.previousDay')} disabled={!previous} onClick={() => previous && onChangeDate(previous)}>
          <ChevronLeft className="size-5" aria-hidden />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold text-ink first-letter:uppercase">{formatDate(date, lang, 'medium')}</p>
          <p className="text-xs text-muted" aria-live="polite">
            {loading ? t('common.loading') : t('booking.time.count', { n: slots?.length ?? 0 })}
          </p>
        </div>
        <IconButton label={t('booking.time.nextDay')} disabled={!next} onClick={() => next && onChangeDate(next)}>
          <ChevronRight className="size-5" aria-hidden />
        </IconButton>
      </div>

      {loading ? (
        // Mirrors the loaded layout (three periods) so the page does not jump when slots arrive.
        <div className="mt-5 flex min-h-[26rem] flex-col gap-6" aria-hidden>
          {[0, 1, 2].map((group) => (
            <div key={group}>
              <Skeleton className="mb-2.5 h-3.5 w-24" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<CalendarX2 className="size-5" aria-hidden />} title={t('booking.time.empty')}>
            {next ? (
              <Button variant="outline" size="sm" onClick={() => onChangeDate(next)}>
                {t('booking.time.nextAvailable', { date: formatDate(next, lang, 'medium') })}
              </Button>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-5 flex min-h-[26rem] flex-col gap-6">
          {groups.map((group) => (
            <section key={group.period} aria-labelledby={`period-${group.period}`}>
              <h3 id={`period-${group.period}`} className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {t(`booking.time.periods.${group.period}`)}
              </h3>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {group.slots.map((slot) => {
                  const isSelected = slot.startUtc === selected
                  return (
                    <li key={slot.startUtc}>
                      <button
                        type="button"
                        onClick={() => onSelect(slot)}
                        aria-pressed={isSelected}
                        aria-label={t('booking.time.slotLabel', { time: slot.localTime, duration: formatDuration(durationMinutes, lang) })}
                        data-testid="slot-option"
                        data-start={slot.startUtc}
                        className={cn(
                          'h-11 w-full rounded-xl border text-[15px] font-semibold tabular transition-colors',
                          isSelected ? 'border-ink bg-ink text-bg' : 'border-border bg-surface text-ink hover:border-ink hover:bg-surface-2',
                        )}
                      >
                        {slot.localTime}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
