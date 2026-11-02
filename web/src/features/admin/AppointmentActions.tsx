import { CheckCheck, CircleSlash, UserX } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatTime, zonedParts } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { useCancelAppointment, useUpdateAppointmentStatus } from '../../lib/queries'
import type { Appointment } from '../../lib/types'
import { useNow } from '../../lib/useNow'

/** Admin actions for one appointment: cancel (future) or record the outcome (past). */
export function AppointmentActions({ appointment, onDone, size = 'sm' }: { appointment: Appointment; onDone?: () => void; size?: 'sm' | 'md' }) {
  const { t, te, lang } = useI18n()
  const { notify } = useToast()
  const cancel = useCancelAppointment()
  const status = useUpdateAppointmentStatus()
  const [confirming, setConfirming] = useState(false)
  const now = useNow()
  const started = new Date(appointment.startUtc).getTime() <= now

  if (appointment.status !== 'Confirmed') return null

  const setOutcome = (value: 'Completed' | 'NoShow') =>
    status.mutate(
      { id: appointment.id, status: value },
      {
        onSuccess: () => {
          notify(t('admin.list.updated'))
          onDone?.()
        },
        onError: (e) => notify(te(e)),
      },
    )

  return (
    <div className="flex flex-wrap gap-1.5">
      {started ? (
        <>
          <Button size={size} variant="outline" loading={status.isPending && status.variables?.status === 'Completed'} onClick={() => setOutcome('Completed')} icon={<CheckCheck className="size-4" aria-hidden />}>
            {t('admin.list.markCompleted')}
          </Button>
          <Button size={size} variant="ghost" loading={status.isPending && status.variables?.status === 'NoShow'} onClick={() => setOutcome('NoShow')} icon={<UserX className="size-4" aria-hidden />}>
            {t('admin.list.markNoShow')}
          </Button>
        </>
      ) : appointment.canCancel ? (
        <Button size={size} variant="ghost" onClick={() => setConfirming(true)} icon={<CircleSlash className="size-4" aria-hidden />}>
          {t('admin.list.cancel')}
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t('appointments.cancelTitle')}
        body={t('appointments.cancelBody', {
          service: `${appointment.service.name} — ${appointment.customer?.fullName ?? ''}`,
          date: formatDate(zonedParts(appointment.startUtc).date, lang, 'medium'),
          time: formatTime(appointment.startUtc),
        })}
        confirmLabel={t('appointments.cancelConfirm')}
        loading={cancel.isPending}
        error={cancel.isError ? te(cancel.error) : null}
        onClose={() => {
          setConfirming(false)
          cancel.reset()
        }}
        onConfirm={() =>
          cancel.mutate(appointment.id, {
            onSuccess: () => {
              setConfirming(false)
              notify(t('appointments.cancelled'))
              onDone?.()
            },
          })
        }
      />
    </div>
  )
}
