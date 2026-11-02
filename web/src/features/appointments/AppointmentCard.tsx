import { Clock, Coins, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { ColorDot } from '../../components/ui/Avatar'
import { StatusBadge } from '../../components/ui/Badge'
import { cn } from '../../lib/cn'
import { formatDate, formatPrice, formatTime, parseDateOnly, zonedParts } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import type { Appointment } from '../../lib/types'

export function DateBlock({ date, muted }: { date: string; muted?: boolean }) {
  const { lang } = useI18n()
  return (
    <div className={cn('flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2.5', muted ? 'bg-surface-2 text-ink-2' : 'bg-ink text-bg')}>
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{formatDate(date, lang, 'weekday')}</span>
      <span className="text-2xl font-semibold leading-tight tabular">{parseDateOnly(date).getDate()}</span>
      <span className="text-[11px] font-medium opacity-80">{formatDate(date, lang, 'short').replace(/^\d+\s*/, '')}</span>
    </div>
  )
}

export function AppointmentCard({ appointment, actions, footer }: { appointment: Appointment; actions?: ReactNode; footer?: ReactNode }) {
  const { t, lang } = useI18n()
  const local = zonedParts(appointment.startUtc)
  const inactive = appointment.status !== 'Confirmed'
  return (
    <article className="card flex flex-col gap-4 p-4 sm:p-5" data-testid="my-appointment" data-id={appointment.id}>
      <div className="flex gap-4">
        <DateBlock date={local.date} muted={inactive} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={cn('text-base font-semibold', inactive && 'text-ink-2')}>{appointment.service.name}</h3>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-0.5 text-sm text-ink-2 first-letter:uppercase">{formatDate(local.date, lang, 'long')}</p>
          <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
            <li className="inline-flex items-center gap-1.5 tabular">
              <Clock className="size-4 text-muted" aria-hidden />
              {formatTime(appointment.startUtc)}–{formatTime(appointment.endUtc)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ColorDot color={appointment.staff.color} />
              {t('appointments.with', { staff: appointment.staff.fullName })}
            </li>
            <li className="inline-flex items-center gap-1.5 tabular">
              <Coins className="size-4 text-muted" aria-hidden />
              {formatPrice(appointment.price, lang)}
            </li>
          </ul>
          {appointment.notes ? (
            <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {appointment.notes}
            </p>
          ) : null}
        </div>
      </div>
      {actions || footer ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted">{footer}</div>
          {actions}
        </div>
      ) : null}
    </article>
  )
}
