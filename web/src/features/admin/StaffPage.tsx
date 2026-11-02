import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarOff, Check, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Avatar } from '../../components/ui/Avatar'
import { Pill } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog'
import { Checkbox, Field, Input, Textarea } from '../../components/ui/Field'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { useToast } from '../../components/ui/Toast'
import { ApiError } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatDate, shortTime } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import type { MessageKey } from '../../lib/i18n/types'
import { useAdminServices, useAdminStaff, useBusiness, useDeleteStaff, useSaveStaff } from '../../lib/queries'
import { staffSchema, type StaffForm } from '../../lib/schemas'
import { STAFF_PALETTE, useSeriesColor } from '../../lib/theme'
import type { AdminStaff, DayOfWeek } from '../../lib/types'
import { PageHeader } from './AdminLayout'

const WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function StaffPage() {
  const { t, te, lang } = useI18n()
  const { notify } = useToast()
  const query = useAdminStaff()
  const services = useAdminServices()
  const business = useBusiness()
  const remove = useDeleteStaff()
  const [editing, setEditing] = useState<AdminStaff | 'new' | null>(null)
  const [deleting, setDeleting] = useState<AdminStaff | null>(null)
  const openDays = WEEK.filter((d) => business.data?.openDays.includes(d) ?? d !== 'Monday')
  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name ?? '…'

  return (
    <div>
      <PageHeader
        title={t('admin.staff.title')}
        subtitle={t('admin.staff.lead')}
        actions={
          <Button onClick={() => setEditing('new')} icon={<Plus className="size-4" aria-hidden />}>
            {t('admin.staff.new')}
          </Button>
        }
      />
      {query.isError ? <Alert tone="error">{te(query.error)}</Alert> : null}
      {!query.data ? (
        <Skeleton className="h-96" />
      ) : query.data.length === 0 ? (
        <EmptyState icon={<Users className="size-5" aria-hidden />} title={t('booking.staff.empty')} />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {query.data.map((s) => {
            const offDays = openDays.filter((d) => !s.workingHours.some((w) => w.dayOfWeek === d))
            return (
              <li key={s.id} className={cn('card flex flex-col p-5', !s.isActive && 'opacity-70')}>
                <div className="flex items-start gap-4">
                  <Avatar name={s.fullName} color={s.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{s.fullName}</h2>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.isActive ? 'bg-success-soft text-success' : 'bg-surface-3 text-ink-2')}>
                        {s.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-ink-2">{s.title}</p>
                    {s.email ? <p className="mt-0.5 text-xs text-muted">{t('admin.staff.login', { email: s.email })}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <IconButton label={`${t('common.edit')}: ${s.fullName}`} onClick={() => setEditing(s)}>
                      <Pencil className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton label={`${t('common.delete')}: ${s.fullName}`} onClick={() => setDeleting(s)}>
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.serviceIds.map((id) => (
                    <Pill key={id}>{serviceName(id)}</Pill>
                  ))}
                </div>
                <table className="mt-4 w-full text-sm">
                  <caption className="sr-only">{t('admin.staff.schedule')}</caption>
                  <tbody>
                    {openDays.map((day) => {
                      const w = s.workingHours.find((h) => h.dayOfWeek === day)
                      return (
                        <tr key={day} className="border-t border-border first:border-t-0">
                          <th scope="row" className="w-24 py-1.5 text-left font-medium text-ink-2">
                            {t(`days.${day}`)}
                          </th>
                          <td className="py-1.5 tabular">
                            {w ? (
                              <>
                                {shortTime(w.start)}–{shortTime(w.end)}
                                {w.breakStart && w.breakEnd ? (
                                  <span className="ml-2 text-xs text-muted">
                                    ({t('admin.calendar.break')} {shortTime(w.breakStart)}–{shortTime(w.breakEnd)})
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-muted">{t('admin.staff.off')}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted">
                  <span>{t('admin.staff.upcoming', { n: s.upcomingAppointments })}</span>
                  {offDays.length > 0 ? <span>· {t('admin.staff.weeklyOff', { days: offDays.map((d) => t(`days.${d}`)).join(', ') })}</span> : null}
                  {s.timeOff.map((off) => (
                    <span key={off.date} className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning">
                      <CalendarOff className="size-3.5" aria-hidden />
                      {formatDate(off.date, lang, 'dayMonth')}
                      {off.reason ? ` · ${off.reason}` : ''}
                    </span>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? t('admin.staff.editTitle') : t('admin.staff.newTitle')} size="lg">
        {editing ? (
          <StaffFormBody
            key={editing === 'new' ? 'new' : editing.id}
            existing={editing === 'new' ? null : editing}
            openDays={openDays}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={t('admin.staff.deleteTitle', { name: deleting?.fullName ?? '' })}
        body={t('admin.staff.deleteBody')}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        error={remove.isError ? te(remove.error) : null}
        onClose={() => {
          setDeleting(null)
          remove.reset()
        }}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
              notify(t('admin.staff.deleted'))
            },
          })
        }
      />
    </div>
  )
}

function toForm(existing: AdminStaff | null, openDays: DayOfWeek[]): StaffForm {
  return {
    fullName: existing?.fullName ?? '',
    title: existing?.title ?? '',
    color: existing?.color ?? STAFF_PALETTE[4]?.light ?? '#e87ba4',
    bio: existing?.bio ?? '',
    isActive: existing?.isActive ?? true,
    serviceIds: existing?.serviceIds ?? [],
    shifts: openDays.map((day) => {
      const w = existing?.workingHours.find((h) => h.dayOfWeek === day)
      return {
        dayOfWeek: day,
        enabled: existing ? Boolean(w) : true,
        start: w ? shortTime(w.start) : '10:00',
        end: w ? shortTime(w.end) : '19:00',
        hasBreak: w ? Boolean(w.breakStart) : true,
        breakStart: w?.breakStart ? shortTime(w.breakStart) : '14:00',
        breakEnd: w?.breakEnd ? shortTime(w.breakEnd) : '14:30',
      }
    }),
    timeOff: (existing?.timeOff ?? []).map((o) => ({ date: o.date, reason: o.reason ?? '' })),
  }
}

function StaffFormBody({ existing, openDays, onClose }: { existing: AdminStaff | null; openDays: DayOfWeek[]; onClose: () => void }) {
  const { t, te } = useI18n()
  const { notify } = useToast()
  const series = useSeriesColor()
  const services = useAdminServices()
  const save = useSaveStaff()
  const form = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: toForm(existing, openDays) })
  const shifts = useFieldArray({ control: form.control, name: 'shifts' })
  const timeOff = useFieldArray({ control: form.control, name: 'timeOff' })
  const watchedShifts = useWatch({ control: form.control, name: 'shifts' })
  const color = useWatch({ control: form.control, name: 'color' })
  const { errors, isSubmitting } = form.formState
  const err = (key?: string) => (key ? (key.startsWith('validation.') ? t(key as MessageKey) : key) : undefined)

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: existing?.id,
        body: {
          fullName: values.fullName,
          title: values.title,
          color: values.color,
          bio: values.bio || null,
          isActive: values.isActive,
          serviceIds: values.serviceIds,
          workingHours: values.shifts
            .filter((s) => s.enabled)
            .map((s) => ({
              dayOfWeek: s.dayOfWeek,
              start: `${s.start}:00`,
              end: `${s.end}:00`,
              breakStart: s.hasBreak ? `${s.breakStart}:00` : null,
              breakEnd: s.hasBreak ? `${s.breakEnd}:00` : null,
            })),
          timeOff: values.timeOff.map((o) => ({ date: o.date, reason: o.reason || null })),
        },
      })
      notify(t('admin.staff.saved'))
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'validation_failed') {
        const first = Object.values(e.fieldErrors)[0]?.[0]
        form.setError('root', { message: first ?? te(e) })
        return
      }
      form.setError('root', { message: te(e) })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {errors.root?.message ? <Alert tone="error">{errors.root.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.staff.fullName')} error={err(errors.fullName?.message)}>
          {(p) => <Input {...p} {...form.register('fullName')} />}
        </Field>
        <Field label={t('admin.staff.titleField')} error={err(errors.title?.message)}>
          {(p) => <Input {...p} {...form.register('title')} />}
        </Field>
        <Field label={`${t('admin.staff.bio')} (${t('common.optional')})`} error={err(errors.bio?.message)} className="sm:col-span-2">
          {(p) => <Textarea {...p} rows={2} {...form.register('bio')} />}
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">{t('admin.staff.color')}</legend>
          <div className="flex flex-wrap gap-2">
            {STAFF_PALETTE.map((c) => {
              const selected = color.toLowerCase() === c.light
              return (
                <label key={c.light} className="relative cursor-pointer">
                  <input type="radio" value={c.light} className="peer sr-only" {...form.register('color')} />
                  <span
                    className={cn('flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface peer-focus-visible:ring-2 peer-focus-visible:ring-ring', selected && 'ring-2 ring-ink')}
                    style={{ background: series(c.light) }}
                  >
                    {selected ? <Check className="size-4 text-white" aria-hidden /> : null}
                  </span>
                  <span className="sr-only">{c.light}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <Checkbox label={t('admin.staff.isActive')} {...form.register('isActive')} className="sm:col-span-2" />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('admin.staff.services')}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {services.data?.map((s) => (
            <Checkbox key={s.id} value={s.id} label={s.name} {...form.register('serviceIds')} />
          ))}
        </div>
        {errors.serviceIds?.message ? <p className="mt-1.5 text-xs font-medium text-danger">{err(errors.serviceIds.message)}</p> : null}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('admin.staff.schedule')}</legend>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-surface-2/60 text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  <span className="sr-only">{t('admin.staff.works')}</span>
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('admin.staff.start')}</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('admin.staff.end')}</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('admin.staff.hasBreak')}</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('admin.staff.breakStart')}</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{t('admin.staff.breakEnd')}</th>
              </tr>
            </thead>
            <tbody>
              {shifts.fields.map((field, index) => {
                const row = watchedShifts?.[index]
                const enabled = row?.enabled ?? false
                const rowError = errors.shifts?.[index]
                const message = rowError?.end?.message ?? rowError?.start?.message ?? rowError?.breakStart?.message
                const dayLabel = t(`days.${field.dayOfWeek}`)
                return (
                  <tr key={field.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <Checkbox label={dayLabel} {...form.register(`shifts.${index}.enabled`)} />
                      {message ? <p className="mt-1 text-xs font-medium text-danger">{err(message)}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <Input type="time" step={900} aria-label={`${dayLabel} ${t('admin.staff.start')}`} disabled={!enabled} className="h-9 w-28" {...form.register(`shifts.${index}.start`)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="time" step={900} aria-label={`${dayLabel} ${t('admin.staff.end')}`} disabled={!enabled} className="h-9 w-28" {...form.register(`shifts.${index}.end`)} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`${dayLabel} ${t('admin.staff.hasBreak')}`}
                        disabled={!enabled}
                        className="mt-2.5 size-4.5 accent-[var(--ink)]"
                        {...form.register(`shifts.${index}.hasBreak`)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="time" step={900} aria-label={`${dayLabel} ${t('admin.staff.breakStart')}`} disabled={!enabled || !row?.hasBreak} className="h-9 w-28" {...form.register(`shifts.${index}.breakStart`)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="time" step={900} aria-label={`${dayLabel} ${t('admin.staff.breakEnd')}`} disabled={!enabled || !row?.hasBreak} className="h-9 w-28" {...form.register(`shifts.${index}.breakEnd`)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('admin.staff.timeOff')}</legend>
        {timeOff.fields.length === 0 ? <p className="text-sm text-muted">{t('admin.staff.noTimeOff')}</p> : null}
        <ul className="flex flex-col gap-2">
          {timeOff.fields.map((field, index) => (
            <li key={field.id} className="flex flex-wrap items-start gap-2">
              <Input type="date" aria-label={t('admin.list.date')} className="h-10 w-44" {...form.register(`timeOff.${index}.date`)} />
              <Input aria-label={t('admin.staff.reason')} placeholder={t('admin.staff.reason')} className="h-10 min-w-0 flex-1" {...form.register(`timeOff.${index}.reason`)} />
              <IconButton label={t('admin.staff.removeTimeOff')} onClick={() => timeOff.remove(index)}>
                <X className="size-4" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-2" icon={<Plus className="size-4" aria-hidden />} onClick={() => timeOff.append({ date: '', reason: '' })}>
          {t('admin.staff.addTimeOff')}
        </Button>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
