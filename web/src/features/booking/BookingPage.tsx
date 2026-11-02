import { Clock, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { Alert, Spinner } from '../../components/ui/Feedback'
import { ApiError } from '../../lib/api'
import { useI18n } from '../../lib/i18n/context'
import { useAvailability, useAvailabilityDays, useBusiness, useCreateAppointment, useServices, useStaff } from '../../lib/queries'
import type { Appointment } from '../../lib/types'
import { BookingSummary } from './BookingSummary'
import { ConfirmStep } from './ConfirmStep'
import { DayStep } from './DayStep'
import { ServiceStep } from './ServiceStep'
import { StaffStep } from './StaffStep'
import { StepHeading } from './StepHeading'
import { StepIndicator } from './StepIndicator'
import { SuccessView } from './SuccessView'
import { TimeStep } from './TimeStep'
import { useBookingState } from './useBookingState'

export function BookingPage() {
  const { t, te } = useI18n()
  const { selection, step, update, goTo, reset } = useBookingState()
  const [booked, setBooked] = useState<Appointment | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Focus moves to the step title only after the visitor has interacted, never on page load.
  const [interacted, setInteracted] = useState(false)

  const business = useBusiness()
  const services = useServices()
  const staff = useStaff(selection.serviceId ?? undefined)
  const staffId = selection.staff && selection.staff !== 'any' ? selection.staff : null
  const today = business.data?.today ?? null
  const days = useAvailabilityDays(selection.serviceId, staffId, selection.staff ? today : null)
  const availability = useAvailability(selection.serviceId, staffId, selection.date)
  const create = useCreateAppointment()

  const service = services.data?.find((s) => s.id === selection.serviceId)
  const member = staff.data?.find((s) => s.id === selection.staff)

  const navigate = (apply: () => void) => {
    setInteracted(true)
    setNotice(null)
    setError(null)
    apply()
  }

  const submit = (notes: string) => {
    if (!selection.serviceId || !selection.slot) return
    setError(null)
    create.mutate(
      { serviceId: selection.serviceId, staffId, startUtc: selection.slot, notes: notes.trim() || null },
      {
        onSuccess: (appointment) => setBooked(appointment),
        onError: (e) => {
          if (e instanceof ApiError && (e.code === 'slot_taken' || e.code === 'slot_invalid')) {
            // Someone else was faster: go back to the time list, which is refetched.
            update({ slot: null })
            setNotice(t('booking.slotTaken'))
            return
          }
          setError(te(e))
        },
      },
    )
  }

  if (booked) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <SuccessView
          appointment={booked}
          business={business.data}
          onBookAnother={() => {
            setBooked(null)
            reset()
          }}
        />
      </div>
    )
  }

  const stepTitle = {
    service: t('booking.service.title'),
    staff: t('booking.staff.title'),
    day: t('booking.day.title'),
    time: t('booking.time.title'),
    confirm: t('booking.confirm.title'),
  }[step]

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className={step === 'service' ? 'pt-10 pb-8 sm:pt-16 sm:pb-10' : 'pt-6 pb-6 sm:pt-8'} aria-labelledby="booking-title">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{t('booking.eyebrow')}</p>
        <h1 id="booking-title" className={step === 'service' ? 'mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl' : 'mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl'}>
          {t('booking.title')}
        </h1>
        {step === 'service' ? (
          <>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">{t('booking.lead')}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
              <li className="inline-flex items-center gap-2">
                <Clock className="size-4 text-muted" aria-hidden />
                {t('booking.hours')} <span className="text-muted">· {t('booking.mondayClosed')}</span>
              </li>
              {business.data ? (
                <>
                  <li className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-muted" aria-hidden />
                    {business.data.address}
                  </li>
                  <li>
                    <a href={`tel:${business.data.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 rounded hover:text-ink">
                      <Phone className="size-4 text-muted" aria-hidden />
                      {business.data.phone}
                    </a>
                  </li>
                </>
              ) : null}
            </ul>
          </>
        ) : null}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-8">
            <StepIndicator current={step} onSelect={(target) => navigate(() => goTo(target))} />
          </div>
          <StepHeading key={step} focusOnMount={interacted}>
            {stepTitle}
          </StepHeading>

          {notice && step === 'time' ? (
            <Alert tone="warning" className="mb-4">
              {notice}
            </Alert>
          ) : null}

          {step === 'service' ? (
            <ServiceStep
              services={services.data}
              loading={services.isPending}
              selectedId={selection.serviceId}
              onSelect={(s) => navigate(() => update({ service: s.id, staff: null, date: null, slot: null }))}
            />
          ) : null}

          {step === 'staff' ? (
            <StaffStep staff={staff.data} loading={staff.isPending} selected={selection.staff} onSelect={(id) => navigate(() => update({ staff: id, date: null, slot: null }))} />
          ) : null}

          {step === 'day' ? (
            today ? (
              <DayStep today={today} days={days.data} loading={days.isPending} selected={selection.date} onSelect={(date) => navigate(() => update({ date, slot: null }))} />
            ) : (
              <Spinner label={t('common.loading')} />
            )
          ) : null}

          {step === 'time' && selection.date ? (
            <TimeStep
              date={selection.date}
              slots={availability.data?.slots}
              loading={availability.isPending}
              durationMinutes={service?.durationMinutes ?? 0}
              days={days.data}
              selected={selection.slot}
              onSelect={(slot) => navigate(() => update({ slot: slot.startUtc }))}
              onChangeDate={(date) => navigate(() => update({ date, slot: null }, true))}
            />
          ) : null}

          {step === 'confirm' ? (
            <div className="flex flex-col gap-4">
              <div className="lg:hidden">
                <BookingSummary selection={selection} service={service} staff={member} onEdit={(target) => navigate(() => goTo(target))} />
              </div>
              <ConfirmStep submitting={create.isPending} error={error} onSubmit={submit} />
            </div>
          ) : null}

          {(services.isError || staff.isError || days.isError || availability.isError) && !notice ? (
            <Alert tone="error" className="mt-4">
              {te(services.error ?? staff.error ?? days.error ?? availability.error)}
            </Alert>
          ) : null}
        </div>

        <aside className="hidden lg:block" aria-label={t('booking.summary.title')}>
          <div className="sticky top-24">
            <BookingSummary selection={selection} service={service} staff={member} onEdit={(target) => navigate(() => goTo(target))} />
          </div>
        </aside>
      </div>
    </div>
  )
}
