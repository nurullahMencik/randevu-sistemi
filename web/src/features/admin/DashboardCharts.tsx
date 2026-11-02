import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { formatDate, formatNumber, formatPercent, formatPrice } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import { useSeriesColor } from '../../lib/theme'
import type { Dashboard } from '../../lib/types'

const axisTick = { fill: 'var(--muted)', fontSize: 11 }

interface DayDatum {
  date: string
  label: string
  value: number | null
  appointments: number
  isOpen: boolean
}

/** Recharts is ~100 kB, so this module is lazy-loaded only on the dashboard. */
export default function DashboardCharts({ data }: { data: Dashboard }) {
  const { t, lang } = useI18n()
  const series = useSeriesColor()

  const past: DayDatum[] = data.daily
    .filter((d) => !d.isFuture)
    .map((d) => ({ date: d.date, label: formatDate(d.date, lang, 'short'), value: d.isOpen ? d.revenue : null, appointments: d.appointments, isOpen: d.isOpen }))
  const future: DayDatum[] = data.daily
    .filter((d) => d.isFuture)
    .map((d) => ({ date: d.date, label: formatDate(d.date, lang, 'short'), value: d.isOpen ? d.occupancy : null, appointments: d.appointments, isOpen: d.isOpen }))
  const staff = data.staff.map((s) => ({ name: s.fullName, value: s.occupancy, color: series(s.color), appointments: s.appointments, revenue: s.revenue }))
  const maxServiceCount = Math.max(1, ...data.services.map((s) => s.count))

  const compactPrice = (v: number) => (v >= 1000 ? `₺${formatNumber(v / 1000, lang)}${lang === 'tr' ? 'B' : 'K'}` : `₺${v}`)

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-3">
      <ChartCard title={t('admin.dashboard.dailyRevenue')} subtitle={t('admin.dashboard.dailyRevenueSub')} className="xl:col-span-2">
        <div className="h-[260px]" role="img" aria-label={`${t('admin.dashboard.dailyRevenue')} — ${t('admin.dashboard.dailyRevenueSub')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={past} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={compactPrice} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={(props: TooltipContentProps) => (
                  <DayTooltip props={props} render={(d) => (d.value === null ? t('admin.dashboard.closed') : formatPrice(d.value, lang))} />
                )}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <DataTable
          caption={t('admin.dashboard.dailyRevenue')}
          headers={[t('admin.dashboard.date'), t('admin.dashboard.revenue'), t('admin.dashboard.appointments')]}
          rows={past.map((d) => [formatDate(d.date, lang, 'medium'), d.value === null ? t('admin.dashboard.closed') : formatPrice(d.value, lang), String(d.appointments)])}
        />
      </ChartCard>

      <ChartCard title={t('admin.dashboard.staffOccupancy')} subtitle={t('admin.dashboard.staffOccupancySub')}>
        <div className="h-[260px]" role="img" aria-label={staff.map((s) => `${s.name} ${formatPercent(s.value, lang)}`).join(', ')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staff} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 0 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--ink-2)', fontSize: 12 }} tickLine={false} axisLine={false} width={104} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={(props: TooltipContentProps) => {
                  const d = props.payload?.[0]?.payload as (typeof staff)[number] | undefined
                  if (!props.active || !d) return null
                  return (
                    <TooltipBox title={d.name} color={d.color}>
                      <strong className="text-ink">{formatPercent(d.value, lang, 1)}</strong> · {d.appointments} {t('admin.dashboard.appointmentsShort')} · {formatPrice(d.revenue, lang)}
                    </TooltipBox>
                  )
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                {staff.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
                <LabelList dataKey="value" position="right" formatter={(v: unknown) => formatPercent(Number(v), lang)} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title={t('admin.dashboard.forwardOccupancy')} subtitle={t('admin.dashboard.forwardOccupancySub')} className="xl:col-span-2">
        <div className="h-[230px]" role="img" aria-label={`${t('admin.dashboard.forwardOccupancy')} — ${t('admin.dashboard.forwardOccupancySub')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={future} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval={0} minTickGap={4} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={(props: TooltipContentProps) => (
                  <DayTooltip props={props} render={(d) => (d.value === null ? t('admin.dashboard.closed') : formatPercent(d.value, lang, 1))} />
                )}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <DataTable
          caption={t('admin.dashboard.forwardOccupancy')}
          headers={[t('admin.dashboard.date'), t('admin.dashboard.occupancy'), t('admin.dashboard.appointments')]}
          rows={future.map((d) => [formatDate(d.date, lang, 'medium'), d.value === null ? t('admin.dashboard.closed') : formatPercent(d.value, lang, 1), String(d.appointments)])}
        />
      </ChartCard>

      <ChartCard title={t('admin.dashboard.serviceMix')} subtitle={t('admin.dashboard.serviceMixSub')}>
        <ul className="flex flex-col gap-3.5">
          {data.services.map((s) => (
            <li key={s.serviceId}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{s.name}</span>
                <span className="shrink-0 tabular text-ink-2">
                  <strong className="font-semibold text-ink">{s.count}</strong> · {formatPrice(s.revenue, lang)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${(s.count / maxServiceCount) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, subtitle, className, children }: { title: string; subtitle: string; className?: string; children: ReactNode }) {
  return (
    <section className={`card p-5 ${className ?? ''}`} aria-label={title}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mb-4 text-xs text-muted">{subtitle}</p>
      {children}
    </section>
  )
}

function TooltipBox({ title, color, children }: { title: string; color?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-ink-2 shadow-lg">
      <p className="mb-1 flex items-center gap-2 font-medium text-ink-2">
        {color ? <span className="h-0.5 w-3 rounded" style={{ background: color }} aria-hidden /> : null}
        {title}
      </p>
      <p>{children}</p>
    </div>
  )
}

function DayTooltip({ props, render }: { props: TooltipContentProps; render: (d: DayDatum) => string }) {
  const { t, lang } = useI18n()
  const d = props.payload?.[0]?.payload as DayDatum | undefined
  if (!props.active || !d) return null
  return (
    <TooltipBox title={formatDate(d.date, lang, 'medium')} color="var(--chart-1)">
      <strong className="text-sm text-ink">{render(d)}</strong>
      {d.isOpen ? ` · ${d.appointments} ${t('admin.dashboard.appointmentsShort')}` : ''}
    </TooltipBox>
  )
}

function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  const { t } = useI18n()
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer rounded text-xs font-medium text-ink-2 hover:text-ink">{t('admin.dashboard.showTable')}</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-border">
                {row.map((cell, i) => (
                  <td key={i} className="px-3 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
