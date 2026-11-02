import { CalendarDays, Clock, Coins, Scissors, Timer, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { ColorDot } from '../../components/ui/Avatar'
import { formatDate, formatDuration, formatPrice, formatTime } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import type { Service, Staff } from '../../lib/types'
import type { BookingSelection, StepId } from './useBookingState'

interface Props {
  selection: BookingSelection
  service: Service | undefined
  staff: Staff | undefined
  onEdit?: (step: StepId) => void
  compact?: boolean
}

export function BookingSummary({ selection, service, staff, onEdit }: Props) {
  const { t, lang } = useI18n()
  const notSelected = <span className="text-muted">{t('common.notSelected')}</span>

  const rows: { step: StepId; label: string; icon: ReactNode; value: ReactNode; set: boolean }[] = [
    { step: 'service', label: t('booking.summary.service'), icon: <Scissors className="size-4" aria-hidden />, value: service?.name ?? notSelected, set: Boolean(service) },
    {
      step: 'staff',
      label: t('booking.summary.staff'),
      icon: <UserRound className="size-4" aria-hidden />,
      value:
        selection.staff === 'any' ? (
          t('booking.confirm.anyStaff')
        ) : staff ? (
          <span className="inline-flex items-center gap-2">
            <ColorDot color={staff.color} />
            {staff.fullName}
          </span>
        ) : (
          notSelected
        ),
      set: Boolean(selection.staff),
    },
    {
      step: 'day',
      label: t('booking.summary.date'),
      icon: <CalendarDays className="size-4" aria-hidden />,
      value: selection.date ? <span className="first-letter:uppercase">{formatDate(selection.date, lang, 'long')}</span> : notSelected,
      set: Boolean(selection.date),
    },
    {
      step: 'time',
      label: t('booking.summary.time'),
      icon: <Clock className="size-4" aria-hidden />,
      value: selection.slot ? <span className="tabular">{formatTime(selection.slot)}</span> : notSelected,
      set: Boolean(selection.slot),
    },
  ]

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-semibold">{t('booking.summary.title')}</h2>
      <dl className="mt-4 flex flex-col divide-y divide-border">
        {rows.map((row) => (
          <div key={row.step} className="flex items-start gap-3 py-3 first:pt-0">
            <span className="mt-0.5 text-muted">{row.icon}</span>
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-muted">{row.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{row.value}</dd>
            </div>
            {row.set && onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(row.step)}
                className="rounded-md px-1.5 py-0.5 text-xs font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                aria-label={t('booking.summary.edit', { step: row.label })}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>
        ))}
      </dl>
      {service ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 text-ink-2">
            <Timer className="size-4" aria-hidden />
            {formatDuration(service.durationMinutes, lang)}
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <Coins className="size-4 text-muted" aria-hidden />
            <span className="tabular">{formatPrice(service.price, lang)}</span>
          </span>
        </div>
      ) : null}
    </div>
  )
}
