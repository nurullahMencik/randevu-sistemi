import { Mail, Phone } from 'lucide-react'
import { ColorDot } from '../../components/ui/Avatar'
import { StatusBadge } from '../../components/ui/Badge'
import { Dialog } from '../../components/ui/Dialog'
import { formatDate, formatDuration, formatPrice, formatTime, zonedParts } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import type { Appointment } from '../../lib/types'
import { AppointmentActions } from './AppointmentActions'

export function AppointmentDetailDialog({ appointment, onClose, actions = true }: { appointment: Appointment | null; onClose: () => void; actions?: boolean }) {
  const { t, lang } = useI18n()
  const a = appointment
  return (
    <Dialog open={a !== null} onClose={onClose} title={t('admin.calendar.detailTitle')} size="sm">
      {a ? (
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">{a.service.name}</p>
              <p className="text-ink-2 first-letter:uppercase">
                {formatDate(zonedParts(a.startUtc).date, lang, 'long')} · <span className="tabular">{formatTime(a.startUtc)}–{formatTime(a.endUtc)}</span>
              </p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 rounded-xl bg-surface-2 p-4">
            <dt className="text-muted">{t('admin.calendar.customer')}</dt>
            <dd className="font-medium">{a.customer?.fullName}</dd>
            {a.customer?.phone ? (
              <>
                <dt className="text-muted">{t('auth.phone')}</dt>
                <dd>
                  <a className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline" href={`tel:${a.customer.phone.replace(/\s/g, '')}`}>
                    <Phone className="size-3.5" aria-hidden />
                    {a.customer.phone}
                  </a>
                </dd>
              </>
            ) : null}
            {a.customer?.email ? (
              <>
                <dt className="text-muted">{t('auth.email')}</dt>
                <dd className="min-w-0">
                  <a className="inline-flex max-w-full items-center gap-1.5 truncate underline-offset-2 hover:underline" href={`mailto:${a.customer.email}`}>
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{a.customer.email}</span>
                  </a>
                </dd>
              </>
            ) : null}
            <dt className="text-muted">{t('booking.summary.staff')}</dt>
            <dd className="inline-flex items-center gap-2">
              <ColorDot color={a.staff.color} />
              {a.staff.fullName}
            </dd>
            <dt className="text-muted">{t('booking.summary.duration')}</dt>
            <dd>{formatDuration(a.service.durationMinutes, lang)}</dd>
            <dt className="text-muted">{t('booking.summary.price')}</dt>
            <dd className="tabular">{formatPrice(a.price, lang)}</dd>
            {a.notes ? (
              <>
                <dt className="text-muted">{t('admin.calendar.notes')}</dt>
                <dd>{a.notes}</dd>
              </>
            ) : null}
          </dl>
          {actions ? <AppointmentActions appointment={a} onDone={onClose} size="md" /> : null}
        </div>
      ) : null}
    </Dialog>
  )
}
