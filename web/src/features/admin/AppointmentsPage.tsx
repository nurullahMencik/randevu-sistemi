import { ChevronLeft, ChevronRight, ListX, RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ColorDot } from '../../components/ui/Avatar'
import { StatusBadge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { addDaysToDateOnly, formatDate, formatPrice, formatTime, zonedParts } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { useAdminAppointments, useServices, useStaff, type AppointmentFilters } from '../../lib/queries'
import type { AppointmentStatus } from '../../lib/types'
import { PageHeader } from './AdminLayout'
import { AppointmentActions } from './AppointmentActions'

const STATUSES: AppointmentStatus[] = ['Confirmed', 'Completed', 'Cancelled', 'NoShow']

function defaults(): AppointmentFilters {
  // Called from a state initialiser and an event handler, never during render.
  const today = zonedParts(new Date().toISOString()).date
  return { from: today, to: addDaysToDateOnly(today, 13), staffId: '', serviceId: '', status: '', search: '', page: 1, descending: false }
}

export function AppointmentsPage() {
  const { t, te, lang } = useI18n()
  const [filters, setFilters] = useState<AppointmentFilters>(defaults)
  const [search, setSearch] = useState('')
  const query = useAdminAppointments(filters)
  const staff = useStaff()
  const services = useServices()

  // Debounce free-text search so we do not query on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })), 300)
    return () => window.clearTimeout(id)
  }, [search])

  const set = <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => setFilters((f) => ({ ...f, [key]: value, page: 1 }))
  const data = query.data

  return (
    <div>
      <PageHeader title={t('admin.list.title')} subtitle={data ? t('common.results', { count: data.totalCount }) : ' '} />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <Field label={t('admin.list.from')}>{(p) => <Input {...p} type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />}</Field>
        <Field label={t('admin.list.to')}>{(p) => <Input {...p} type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />}</Field>
        <Field label={t('admin.list.staff')}>
          {(p) => (
            <Select {...p} value={filters.staffId} onChange={(e) => set('staffId', e.target.value)}>
              <option value="">{t('common.all')}</option>
              {staff.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('admin.list.service')}>
          {(p) => (
            <Select {...p} value={filters.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
              <option value="">{t('common.all')}</option>
              {services.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('admin.list.status')}>
          {(p) => (
            <Select {...p} value={filters.status} onChange={(e) => set('status', e.target.value as AppointmentStatus | '')}>
              <option value="">{t('common.all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('admin.list.sort')}>
          {(p) => (
            <Select {...p} value={filters.descending ? 'desc' : 'asc'} onChange={(e) => set('descending', e.target.value === 'desc')}>
              <option value="asc">{t('admin.list.oldest')}</option>
              <option value="desc">{t('admin.list.newest')}</option>
            </Select>
          )}
        </Field>
        <Field label={t('admin.list.search')}>
          {(p) => (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input {...p} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.list.searchPlaceholder')} className="pl-9" />
            </div>
          )}
        </Field>
        <div className="flex items-end sm:col-span-2 lg:col-span-4 2xl:col-span-7">
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="size-4" aria-hidden />}
            onClick={() => {
              setSearch('')
              setFilters({ ...defaults(), from: '', to: '' })
            }}
          >
            {t('admin.list.reset')}
          </Button>
        </div>
      </div>

      {query.isError ? <Alert tone="error">{te(query.error)}</Alert> : null}

      {!data ? (
        <Skeleton className="h-96" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<ListX className="size-5" aria-hidden />} title={t('admin.list.empty')} />
      ) : (
        <div className={cn('card overflow-hidden transition-opacity', query.isPlaceholderData && 'opacity-60')}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t('admin.list.title')}</caption>
              <thead className="border-b border-border bg-surface-2/60 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.list.date')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.list.customer')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.list.service')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.list.staff')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('admin.list.price')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.list.status')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">{t('admin.list.actions')}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((a) => (
                  <tr key={a.id} className="align-middle hover:bg-surface-2/40">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="block font-medium first-letter:uppercase">{formatDate(zonedParts(a.startUtc).date, lang, 'medium')}</span>
                      <span className="text-xs text-muted tabular">{formatTime(a.startUtc)}–{formatTime(a.endUtc)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{a.customer?.fullName}</span>
                      <span className="text-xs text-muted">{a.customer?.phone ?? a.customer?.email}</span>
                    </td>
                    <td className="px-4 py-3">{a.service.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <ColorDot color={a.staff.color} />
                        {a.staff.fullName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{formatPrice(a.price, lang)}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3"><AppointmentActions appointment={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border md:hidden">
            {data.items.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium first-letter:uppercase">
                      {formatDate(zonedParts(a.startUtc).date, lang, 'medium')} · <span className="tabular">{formatTime(a.startUtc)}</span>
                    </p>
                    <p className="text-sm text-ink-2">
                      {a.service.name} · {a.customer?.fullName}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted">
                      <ColorDot color={a.staff.color} />
                      {a.staff.fullName} · {formatPrice(a.price, lang)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <AppointmentActions appointment={a} />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-ink-2">
            <span>{t('common.page', { page: data.page, total: Math.max(1, data.totalPages) })}</span>
            <div className="flex gap-1">
              <IconButton label={t('common.previous')} disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                <ChevronLeft className="size-5" aria-hidden />
              </IconButton>
              <IconButton label={t('common.next')} disabled={data.page >= data.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                <ChevronRight className="size-5" aria-hidden />
              </IconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
