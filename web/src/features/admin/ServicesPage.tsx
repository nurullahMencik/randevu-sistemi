import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pill } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog'
import { Checkbox, Field, Input, Textarea } from '../../components/ui/Field'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { useToast } from '../../components/ui/Toast'
import { ApiError } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatDuration, formatPrice } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import type { MessageKey } from '../../lib/i18n/types'
import { useAdminServices, useDeleteService, useSaveService } from '../../lib/queries'
import { serviceSchema, type ServiceForm } from '../../lib/schemas'
import type { AdminService } from '../../lib/types'
import { PageHeader } from './AdminLayout'

export function ServicesPage() {
  const { t, te, lang } = useI18n()
  const { notify } = useToast()
  const query = useAdminServices()
  const remove = useDeleteService()
  const [editing, setEditing] = useState<AdminService | 'new' | null>(null)
  const [deleting, setDeleting] = useState<AdminService | null>(null)

  return (
    <div>
      <PageHeader
        title={t('admin.services.title')}
        subtitle={t('admin.services.lead')}
        actions={
          <Button onClick={() => setEditing('new')} icon={<Plus className="size-4" aria-hidden />}>
            {t('admin.services.new')}
          </Button>
        }
      />
      {query.isError ? <Alert tone="error">{te(query.error)}</Alert> : null}
      {!query.data ? (
        <Skeleton className="h-80" />
      ) : query.data.length === 0 ? (
        <EmptyState icon={<Scissors className="size-5" aria-hidden />} title={t('booking.service.empty')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {query.data.map((s) => (
            <li key={s.id} className={cn('card flex flex-col p-5', !s.isActive && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">{s.name}</h2>
                  {s.description ? <p className="mt-1 text-sm text-ink-2">{s.description}</p> : null}
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', s.isActive ? 'bg-success-soft text-success' : 'bg-surface-3 text-ink-2')}>
                  {s.isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Pill>{formatDuration(s.durationMinutes, lang)}</Pill>
                <Pill>{t('admin.services.staffCount', { n: s.staffCount })}</Pill>
                <Pill>{t('admin.services.upcoming', { n: s.upcomingAppointments })}</Pill>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-xl font-semibold tabular">{formatPrice(s.price, lang)}</span>
                <div className="flex gap-1">
                  <IconButton label={`${t('common.edit')}: ${s.name}`} onClick={() => setEditing(s)}>
                    <Pencil className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label={`${t('common.delete')}: ${s.name}`} onClick={() => setDeleting(s)}>
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServiceDialog service={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title={t('admin.services.deleteTitle', { name: deleting?.name ?? '' })}
        body={t('admin.services.deleteBody')}
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
              notify(t('admin.services.deleted'))
            },
          })
        }
      />
    </div>
  )
}

function ServiceDialog({ service, onClose }: { service: AdminService | 'new' | null; onClose: () => void }) {
  const { t } = useI18n()
  const existing = service && service !== 'new' ? service : null
  return (
    <Dialog open={service !== null} onClose={onClose} title={existing ? t('admin.services.editTitle') : t('admin.services.newTitle')}>
      {service ? <ServiceFormBody key={existing?.id ?? 'new'} existing={existing} onClose={onClose} /> : null}
    </Dialog>
  )
}

function ServiceFormBody({ existing, onClose }: { existing: AdminService | null; onClose: () => void }) {
  const { t, te } = useI18n()
  const { notify } = useToast()
  const save = useSaveService()
  const form = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: existing
      ? {
          name: existing.name,
          description: existing.description ?? '',
          durationMinutes: existing.durationMinutes,
          price: existing.price,
          isActive: existing.isActive,
          sortOrder: existing.sortOrder,
        }
      : { name: '', description: '', durationMinutes: 45, price: 500, isActive: true, sortOrder: 10 },
  })
  const { errors, isSubmitting } = form.formState
  const err = (key?: string) => (key ? (key.startsWith('validation.') ? t(key as MessageKey) : key) : undefined)

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: existing?.id, body: { ...values, description: values.description || null } })
      notify(t('admin.services.saved'))
      onClose()
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [field, messages] of Object.entries(e.fieldErrors)) {
          if (field in values) form.setError(field as keyof ServiceForm, { message: messages[0] })
        }
      }
      form.setError('root', { message: te(e) })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {errors.root?.message ? (
        <Alert tone="error" className="sm:col-span-2">
          {errors.root.message}
        </Alert>
      ) : null}
      <Field label={t('admin.services.name')} error={err(errors.name?.message)} className="sm:col-span-2">
        {(p) => <Input {...p} {...form.register('name')} />}
      </Field>
      <Field label={`${t('admin.services.description')} (${t('common.optional')})`} error={err(errors.description?.message)} className="sm:col-span-2">
        {(p) => <Textarea {...p} rows={2} {...form.register('description')} />}
      </Field>
      <Field label={t('admin.services.duration')} error={err(errors.durationMinutes?.message)}>
        {(p) => <Input {...p} type="number" step={15} min={15} max={480} inputMode="numeric" {...form.register('durationMinutes', { valueAsNumber: true })} />}
      </Field>
      <Field label={t('admin.services.price')} error={err(errors.price?.message)}>
        {(p) => <Input {...p} type="number" step={10} min={0} inputMode="decimal" {...form.register('price', { valueAsNumber: true })} />}
      </Field>
      <Field label={t('admin.services.sortOrder')} error={err(errors.sortOrder?.message)}>
        {(p) => <Input {...p} type="number" min={0} max={1000} inputMode="numeric" {...form.register('sortOrder', { valueAsNumber: true })} />}
      </Field>
      <div className="flex items-end pb-2.5">
        <Checkbox label={t('admin.services.isActive')} {...form.register('isActive')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4 sm:col-span-2">
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
