import { CalendarPlus, CalendarX2, History } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Segmented } from '../../components/ui/Segmented'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatTime, zonedParts } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { useBusiness, useCancelAppointment, useMyAppointments } from '../../lib/queries'
import type { Appointment } from '../../lib/types'
import { AppointmentCard } from './AppointmentCard'

export function MyAppointmentsPage() {
  const { t, te, lang } = useI18n()
  const { notify } = useToast()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [toCancel, setToCancel] = useState<Appointment | null>(null)
  const query = useMyAppointments()
  const business = useBusiness()
  const cancel = useCancelAppointment()

  const list = query.data ? query.data[tab] : []

  const confirmCancel = () => {
    if (!toCancel) return
    cancel.mutate(toCancel.id, {
      onSuccess: () => {
        setToCancel(null)
        notify(t('appointments.cancelled'))
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{t('appointments.title')}</h1>
          <p className="mt-2 text-ink-2">{t('appointments.lead')}</p>
        </div>
        <ButtonLink to="/" variant="outline" icon={<CalendarPlus className="size-4" aria-hidden />}>
          {t('appointments.bookNow')}
        </ButtonLink>
      </div>

      <Segmented
        className="mt-8"
        label={t('appointments.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: `${t('appointments.upcoming')}${query.data ? ` (${query.data.upcoming.length})` : ''}` },
          { value: 'past', label: `${t('appointments.past')}${query.data ? ` (${query.data.past.length})` : ''}` },
        ]}
      />

      <div className="mt-6 flex flex-col gap-3">
        {query.isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-36" />)
        ) : query.isError ? (
          <Alert tone="error" action={<Button size="sm" variant="outline" onClick={() => void query.refetch()}>{t('common.retry')}</Button>}>
            {te(query.error)}
          </Alert>
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === 'upcoming' ? <CalendarX2 className="size-5" aria-hidden /> : <History className="size-5" aria-hidden />}
            title={tab === 'upcoming' ? t('appointments.emptyUpcoming') : t('appointments.emptyPast')}
          >
            {tab === 'upcoming' ? (
              <ButtonLink to="/" size="sm">
                {t('appointments.bookNow')}
              </ButtonLink>
            ) : null}
          </EmptyState>
        ) : (
          list.map((appointment) => {
            const deadline = zonedParts(appointment.cancellationDeadlineUtc)
            return (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                footer={
                  tab === 'upcoming'
                    ? appointment.canCancel
                      ? t('appointments.deadline', { date: formatDate(deadline.date, lang, 'dayMonth'), time: deadline.time })
                      : t('appointments.deadlinePassed', { phone: business.data?.phone ?? '' })
                    : undefined
                }
                actions={
                  tab === 'upcoming' && appointment.canCancel ? (
                    <Button variant="outline" size="sm" onClick={() => setToCancel(appointment)}>
                      {t('appointments.cancel')}
                    </Button>
                  ) : undefined
                }
              />
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        title={t('appointments.cancelTitle')}
        body={
          toCancel
            ? t('appointments.cancelBody', {
                service: toCancel.service.name,
                date: formatDate(zonedParts(toCancel.startUtc).date, lang, 'medium'),
                time: formatTime(toCancel.startUtc),
              })
            : ''
        }
        confirmLabel={t('appointments.cancelConfirm')}
        loading={cancel.isPending}
        error={cancel.isError ? te(cancel.error) : null}
        onConfirm={confirmCancel}
        onClose={() => {
          setToCancel(null)
          cancel.reset()
        }}
      />
    </div>
  )
}
