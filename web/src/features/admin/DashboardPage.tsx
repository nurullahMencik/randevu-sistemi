import { CalendarClock, CalendarRange, Minus, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { Segmented } from '../../components/ui/Segmented'
import { cn } from '../../lib/cn'
import { formatDate, formatNumber, formatPercent, formatPrice } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { useDashboard } from '../../lib/queries'
import type { Kpi } from '../../lib/types'
import { PageHeader } from './AdminLayout'

const DashboardCharts = lazy(() => import('./DashboardCharts'))

export function DashboardPage() {
  const { t, te, lang } = useI18n()
  const [days, setDays] = useState(7)
  const query = useDashboard(days)
  const data = query.data

  return (
    <div>
      <PageHeader
        title={t('admin.dashboard.title')}
        subtitle={data ? t('admin.dashboard.period', { from: formatDate(data.from, lang, 'dayMonth'), to: formatDate(data.to, lang, 'dayMonth') }) : ' '}
        actions={
          <Segmented
            label={t('admin.dashboard.range')}
            value={days}
            onChange={setDays}
            options={[7, 14, 28].map((n) => ({ value: n, label: t('admin.dashboard.rangeOption', { n }) }))}
          />
        }
      />

      {query.isError ? <Alert tone="error">{te(query.error)}</Alert> : null}

      <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')} aria-busy={query.isFetching}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data ? (
            <>
              <KpiTile label={t('admin.dashboard.revenue')} value={formatPrice(data.revenue.value, lang)} kpi={data.revenue} days={data.rangeDays} />
              <KpiTile label={t('admin.dashboard.appointments')} value={formatNumber(data.appointments.value, lang)} kpi={data.appointments} days={data.rangeDays} />
              <KpiTile label={t('admin.dashboard.occupancy')} value={formatPercent(data.occupancy.value, lang, 1)} kpi={data.occupancy} days={data.rangeDays} />
              <div className="card flex flex-col p-5" data-testid="kpi-popular">
                <p className="text-sm font-medium text-ink-2">{t('admin.dashboard.popular')}</p>
                <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{data.popularService?.name ?? '—'}</p>
                {data.popularService ? (
                  <>
                    <div className="mt-auto pt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${data.popularService.share}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {t('admin.dashboard.popularShare', { share: formatNumber(data.popularService.share, lang, 1) })} · {formatNumber(data.popularService.count, lang)}{' '}
                        {t('admin.dashboard.appointmentsShort')}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[138px]" />)
          )}
        </div>

        {data ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            <Stat icon={<CalendarClock className="size-4" aria-hidden />} label={t('admin.dashboard.today')} value={t('admin.dashboard.todayValue', { n: data.todayAppointments })} />
            <Stat
              icon={<CalendarRange className="size-4" aria-hidden />}
              label={t('admin.dashboard.nextWeek')}
              value={t('admin.dashboard.nextWeekValue', { n: data.nextSevenDaysAppointments, revenue: formatPrice(data.nextSevenDaysRevenue, lang) })}
            />
            <Stat icon={<XCircle className="size-4" aria-hidden />} label={t('admin.dashboard.cancellationRate')} value={formatPercent(data.cancellationRate, lang, 1)} />
          </ul>
        ) : null}

        <Suspense fallback={<ChartsSkeleton />}>{data ? <DashboardCharts data={data} /> : <ChartsSkeleton />}</Suspense>
      </div>
    </div>
  )
}

function KpiTile({ label, value, kpi, days }: { label: string; value: string; kpi: Kpi; days: number }) {
  const { t, lang } = useI18n()
  const change = kpi.changePercent
  const Icon = change === null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown
  return (
    <div className="card p-5" data-testid="kpi-tile">
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
            change === null || change === 0 ? 'bg-surface-2 text-ink-2' : change > 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {change === null ? '—' : `${change > 0 ? '+' : ''}${formatNumber(change, lang, 1)}%`}
        </span>
        {change === null ? t('admin.dashboard.noBaseline') : t('admin.dashboard.vsPrevious', { n: days })}
      </p>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
      <span className="text-muted">{icon}</span>
      <span className="text-ink-2">{label}:</span>
      <span className="font-medium text-ink">{value}</span>
    </li>
  )
}

function ChartsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-3">
      <Skeleton className="h-[352px] xl:col-span-2" />
      <Skeleton className="h-[352px]" />
      <Skeleton className="h-[320px] xl:col-span-2" />
      <Skeleton className="h-[320px]" />
    </div>
  )
}
