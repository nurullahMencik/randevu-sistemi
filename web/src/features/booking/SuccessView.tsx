import { CalendarPlus, CheckCircle2, Download, ListChecks } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ColorDot } from '../../components/ui/Avatar'
import { Button, ButtonLink } from '../../components/ui/Button'
import { formatDate, formatDuration, formatPrice, formatTime, zonedParts } from '../../lib/format'
import { buildIcs } from '../../lib/ics'
import { useI18n } from '../../lib/i18n/context'
import type { Appointment, BusinessInfo } from '../../lib/types'

export function SuccessView({ appointment, business, onBookAnother }: {
  appointment: Appointment
  business: BusinessInfo | undefined
  onBookAnother: () => void
}) {
  const { t, lang } = useI18n()
  const local = zonedParts(appointment.startUtc)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  const download = () => {
    const ics = buildIcs({
      uid: appointment.id,
      startUtc: appointment.startUtc,
      endUtc: appointment.endUtc,
      title: `${appointment.service.name} — ${business?.name ?? t('common.brand')}`,
      location: business?.address,
      description: t('booking.success.with', { staff: appointment.staff.fullName }),
    })
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `randevu-${local.date}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card animate-rise mx-auto max-w-xl p-6 text-center sm:p-10" data-testid="booking-success">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>
      <h2 className="mt-5 font-display text-3xl font-semibold" tabIndex={-1} ref={heading}>
        {t('booking.success.title')}
      </h2>
      <p className="mt-2 text-ink-2">{t('booking.success.body', { date: formatDate(local.date, lang, 'medium'), time: local.time })}</p>
      <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-surface-2 p-5 text-left text-sm">
        <dt className="text-muted">{t('booking.summary.service')}</dt>
        <dd className="font-medium">{appointment.service.name}</dd>
        <dt className="text-muted">{t('booking.summary.staff')}</dt>
        <dd className="inline-flex items-center gap-2 font-medium">
          <ColorDot color={appointment.staff.color} />
          {appointment.staff.fullName}
        </dd>
        <dt className="text-muted">{t('booking.summary.time')}</dt>
        <dd className="font-medium tabular">
          {formatTime(appointment.startUtc)}–{formatTime(appointment.endUtc)}
        </dd>
        <dt className="text-muted">{t('booking.summary.duration')}</dt>
        <dd className="font-medium">{formatDuration(appointment.service.durationMinutes, lang)}</dd>
        <dt className="text-muted">{t('booking.summary.price')}</dt>
        <dd className="font-medium tabular">{formatPrice(appointment.price, lang)}</dd>
      </dl>
      <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="outline" onClick={download} icon={<Download className="size-4" aria-hidden />}>
          {t('booking.success.addToCalendar')}
        </Button>
        <ButtonLink to="/appointments" icon={<ListChecks className="size-4" aria-hidden />}>
          {t('booking.success.viewAll')}
        </ButtonLink>
        <Button variant="ghost" onClick={onBookAnother} icon={<CalendarPlus className="size-4" aria-hidden />}>
          {t('booking.success.bookAnother')}
        </Button>
      </div>
    </div>
  )
}
