import { Skeleton } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { formatDate, parseDateOnly } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { buildDayGrid } from '../../lib/slots'
import type { DayAvailability, DayOfWeek } from '../../lib/types'

const WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function DayStep({ today, days, loading, selected, onSelect }: {
  today: string
  days: DayAvailability[] | undefined
  loading: boolean
  selected: string | null
  onSelect: (date: string) => void
}) {
  const { t, lang } = useI18n()
  const weeks = buildDayGrid(today, 14, days ?? [])

  return (
    <div className="card p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-sm font-medium text-ink-2">{t('booking.day.nextTwoWeeks')}</p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            {t('booking.day.legendFree')}
          </span>
          <span className="hidden items-center gap-1.5 min-[420px]:inline-flex">
            <span className="size-2 rounded-full bg-border-strong" aria-hidden />
            {t('booking.day.legendFull')}
          </span>
        </div>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-1.5">
        <caption className="sr-only">{t('booking.day.title')}</caption>
        <thead>
          <tr>
            {WEEK.map((day) => (
              <th key={day} scope="col" className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                <abbr title={t(`days.${day}`)} className="no-underline">
                  {t(`daysShort.${day}`)}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.date}>
              {week.map((cell) => {
                if (!cell.inRange)
                  return (
                    <td key={cell.date} className="h-16 text-center text-sm text-muted opacity-50">
                      {parseDateOnly(cell.date).getDate()}
                    </td>
                  )
                if (loading)
                  return (
                    <td key={cell.date}>
                      <Skeleton className="h-16" />
                    </td>
                  )
                const bookable = cell.isOpen && cell.available > 0
                const isSelected = cell.date === selected
                const dayNumber = parseDateOnly(cell.date).getDate()
                const status = !cell.isOpen ? t('booking.day.closed') : cell.available === 0 ? t('booking.day.full') : t('booking.day.free', { n: cell.available })
                return (
                  <td key={cell.date} className="p-0">
                    <button
                      type="button"
                      disabled={!bookable}
                      onClick={() => onSelect(cell.date)}
                      aria-pressed={isSelected}
                      aria-label={`${formatDate(cell.date, lang, 'medium')} — ${status}`}
                      data-testid="day-option"
                      data-date={cell.date}
                      className={cn(
                        'relative flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-colors',
                        bookable && !isSelected && 'border-border bg-surface hover:border-ink',
                        isSelected && 'border-ink bg-ink text-bg',
                        !bookable && 'cursor-not-allowed border-transparent bg-surface-2/60 text-muted',
                      )}
                    >
                      <span className={cn('text-lg font-semibold leading-none tabular', !bookable && 'opacity-70')}>{dayNumber}</span>
                      <span className={cn('max-w-full truncate px-0.5 text-[10px] leading-tight sm:text-[11px]', isSelected ? 'text-bg/80' : bookable ? 'text-success' : 'text-muted')}>
                        {status}
                      </span>
                      {cell.isToday ? <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-brand" aria-hidden /> : null}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
